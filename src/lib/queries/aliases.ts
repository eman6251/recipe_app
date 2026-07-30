import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { BUILTIN_SYNONYMS } from "@/lib/synonyms";

const AliasChoices = z.object({
  names: z.array(
    z.object({
      name: z.string().describe("The input name, exactly as given"),
      canonical: z
        .string()
        .describe(
          "The canonical name this product should be grouped under — an existing canonical when it's the same product, otherwise the name itself",
        ),
    }),
  ),
});

const SYSTEM = `You group grocery ingredient names that refer to the same product, so a shopping list can add their quantities together.

Merge only when the names would send someone to pick up the SAME item in a store — regional or spelling variants of one product (scallions/green onions, aubergine/eggplant, prawns/shrimp).

Do NOT merge:
- different forms of one ingredient that are bought separately (garlic vs garlic powder, fresh ginger vs ground ginger, tomatoes vs tomato paste)
- different varieties or cuts (chicken thigh vs chicken breast, red onion vs yellow onion, brown rice vs white rice)
- anything where you are unsure — leaving two lines separate is much better than combining products that aren't interchangeable.

For each input name, return the canonical name to group it under. Prefer one of the existing canonical names when it's the same product. Otherwise return the input name unchanged, using the clearest common US grocery name.`;

/**
 * Map ingredient keys to the canonical key they should be grouped under.
 *
 * Three tiers, cheapest first: a built-in synonym table, aliases already
 * learned and stored for this user, then one batched model call for names
 * never seen before. Every resolution is persisted — including names that
 * turn out to be their own canonical — so the model is only consulted the
 * first time an ingredient name shows up.
 */
export async function resolveIngredientAliases(
  keys: string[],
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const distinct = [...new Set(keys.filter(Boolean))];
  if (distinct.length === 0) return resolved;

  for (const key of distinct) {
    const builtin = BUILTIN_SYNONYMS.get(key);
    if (builtin) resolved.set(key, builtin);
  }

  const supabase = await createClient();
  const { data: stored } = await supabase
    .from("ingredient_aliases")
    .select("alias, canonical")
    .in("alias", distinct);

  for (const row of stored ?? []) {
    if (!resolved.has(row.alias)) resolved.set(row.alias, row.canonical);
  }

  const unknown = distinct.filter((k) => !resolved.has(k));
  if (unknown.length === 0 || !process.env.ANTHROPIC_API_KEY) {
    for (const key of unknown) resolved.set(key, key);
    return resolved;
  }

  // Canonicals already in play — the model should reuse these when an unknown
  // name is the same product, rather than inventing a parallel spelling.
  const pool = [...new Set([...resolved.values(), ...unknown])];

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Existing canonical names:\n${pool.join("\n")}\n\nNames to resolve:\n${unknown.join("\n")}`,
        },
      ],
      output_config: { format: zodOutputFormat(AliasChoices) },
    });

    const choices = new Map(
      (response.parsed_output?.names ?? []).map((c) => [
        c.name.toLowerCase().trim(),
        c.canonical.toLowerCase().trim(),
      ]),
    );

    for (const key of unknown) {
      resolved.set(key, choices.get(key) || key);
    }

    const rows = unknown.map((alias) => ({
      alias,
      canonical: resolved.get(alias)!,
    }));
    await supabase
      .from("ingredient_aliases")
      .upsert(rows, { onConflict: "user_id,alias" });
  } catch {
    // Merging is a convenience — on failure every name stands on its own.
    for (const key of unknown) resolved.set(key, key);
  }

  return resolved;
}
