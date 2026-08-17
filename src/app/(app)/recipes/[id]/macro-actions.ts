"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkAiBudget, logAiUsage } from "@/lib/ai-usage";
import { getRecipe } from "@/lib/queries/recipes";
import {
  searchUsdaCandidates,
  pickBestLocal,
  scaleMacros,
  addMacros,
  roundMacros,
  UsdaAuthError,
  type UsdaMatch,
} from "@/lib/usda";
import type { Macros, RecipeIngredient } from "@/lib/types";

export type MacroLine = {
  item: string;
  grams: number | null;
  /** USDA food description it matched, or null if skipped. */
  match: string | null;
  kcal: number | null;
};

export type MacroComputeResult =
  | {
      ok: true;
      per_serving: Macros;
      matched: number;
      total: number;
      /** Per-ingredient breakdown for eyeballing bad matches/grams. */
      lines: MacroLine[];
      /** Ingredient lines that couldn't participate, with the reason. */
      skipped: { item: string; reason: string }[];
    }
  | { ok: false; error: string };

const GramEstimates = z.object({
  estimates: z.array(
    z.object({
      index: z.number().describe("The line's index as given"),
      grams: z
        .number()
        .nullable()
        .describe("Estimated total grams for the line; null if unestimable"),
    }),
  ),
});

/** Ask Claude for gram estimates for ingredient lines that lack them. */
async function fillMissingGrams(
  lines: { index: number; text: string }[],
): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (lines.length === 0 || !process.env.ANTHROPIC_API_KEY) return out;

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      system:
        "Estimate the total weight in grams of each ingredient line using common culinary weights (1 tbsp olive oil ≈ 13.5g, 1 cup flour ≈ 120g, 1 medium onion ≈ 110g). Give your best estimate; use null only when genuinely impossible.",
      messages: [
        {
          role: "user",
          content: lines.map((l) => `${l.index}: ${l.text}`).join("\n"),
        },
      ],
      output_config: { format: zodOutputFormat(GramEstimates) },
    });

    await logAiUsage("macro_grams", "claude-sonnet-5", response.usage);

    for (const e of response.parsed_output?.estimates ?? []) {
      if (e.grams != null && e.grams > 0) out.set(e.index, e.grams);
    }
  } catch {
    // Gram-filling is best-effort; lines stay skipped if it fails.
  }
  return out;
}

const MatchChoices = z.object({
  choices: z.array(
    z.object({
      item: z.string().describe("The ingredient exactly as given"),
      fdc_id: z
        .number()
        .nullable()
        .describe("fdc_id of the best candidate, or null if none represents this ingredient"),
    }),
  ),
});

/**
 * Pick the best USDA candidate per ingredient. Keyword scoring alone
 * mismatches badly ("palm sugar" → "Hearts of palm"), so Claude chooses in a
 * single batched call; the local scorer is the no-key/error fallback.
 */
async function chooseMatches(
  needs: { item: string; candidates: UsdaMatch[] }[],
): Promise<Map<string, UsdaMatch | null>> {
  const out = new Map<string, UsdaMatch | null>();
  const undecided = needs.filter((n) => n.candidates.length > 0);
  for (const n of needs) {
    if (n.candidates.length === 0) out.set(n.item, null);
  }
  if (undecided.length === 0) return out;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const listing = undecided
        .map(
          (n) =>
            `${n.item}:\n${n.candidates
              .map((c) => `  [${c.fdc_id}] ${c.description}`)
              .join("\n")}`,
        )
        .join("\n\n");

      const response = await client.messages.parse({
        model: "claude-sonnet-5",
        max_tokens: 4000,
        system:
          "For each recipe ingredient, pick the USDA food entry that best represents it nutritionally as used in home cooking. Recipe quantities describe the as-purchased state, so prefer raw/dry entries over cooked ones. Return null when no candidate is genuinely the same food (a wrong-food match is worse than no match).",
        messages: [{ role: "user", content: listing }],
        output_config: { format: zodOutputFormat(MatchChoices) },
      });

      await logAiUsage("macro_match", "claude-sonnet-5", response.usage);

      const byItem = new Map(
        (response.parsed_output?.choices ?? []).map((c) => [
          c.item.toLowerCase().trim(),
          c.fdc_id,
        ]),
      );

      for (const n of undecided) {
        const chosen = byItem.get(n.item);
        if (chosen === null) {
          out.set(n.item, null); // Claude says nothing fits — trust it
        } else if (chosen !== undefined) {
          const match = n.candidates.find((c) => c.fdc_id === chosen);
          out.set(n.item, match ?? pickBestLocal(n.item, n.candidates));
        } else {
          out.set(n.item, pickBestLocal(n.item, n.candidates));
        }
      }
      return out;
    } catch {
      // fall through to local scoring
    }
  }

  for (const n of undecided) {
    out.set(n.item, pickBestLocal(n.item, n.candidates));
  }
  return out;
}

export async function computeMacros(
  recipeId: string,
  force = false,
): Promise<MacroComputeResult> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "No USDA_API_KEY set. Get a free key at fdc.nal.usda.gov/api-key-signup.html, add it to .env.local, and restart the dev server.",
    };
  }

  const budget = await checkAiBudget();
  if (!budget.allowed) return { ok: false, error: budget.error! };

  const recipe = await getRecipe(recipeId);
  if (!recipe) return { ok: false, error: "Recipe not found." };
  if (recipe.recipe_ingredients.length === 0) {
    return { ok: false, error: "No ingredients to compute from." };
  }

  const supabase = await createClient();
  const skipped: { item: string; reason: string }[] = [];

  // 1. Fill missing gram estimates via Claude (manual entries lack them).
  const gramless = recipe.recipe_ingredients
    .map((ing, index) => ({ ing, index }))
    .filter(({ ing }) => ing.grams == null || ing.grams <= 0);
  const estimates = await fillMissingGrams(
    gramless.map(({ ing, index }) => ({
      index,
      text: [ing.quantity, ing.unit, ing.item, ing.note && `(${ing.note})`]
        .filter(Boolean)
        .join(" "),
    })),
  );

  const gramsFor = (ing: RecipeIngredient, index: number) =>
    ing.grams ?? estimates.get(index) ?? null;

  // 2. Search USDA for every line that needs a (re)match, then let Claude
  //    choose among candidates in one batched call.
  const needLookup = new Map<string, UsdaMatch[]>();
  for (const [index, ing] of recipe.recipe_ingredients.entries()) {
    const grams = gramsFor(ing, index);
    if (grams == null || grams <= 0) continue;
    if (!force && ing.macros && ing.grams === grams && ing.fdc_id) continue;
    needLookup.set(ing.item.toLowerCase().trim(), []);
  }

  try {
    await Promise.all(
      [...needLookup.keys()].map(async (key) => {
        needLookup.set(key, await searchUsdaCandidates(key, apiKey));
      }),
    );
  } catch (err) {
    if (err instanceof UsdaAuthError) {
      return { ok: false, error: "USDA rejected the API key — double-check USDA_API_KEY in .env.local." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "USDA lookup failed." };
  }

  const matches = await chooseMatches(
    [...needLookup.entries()].map(([item, candidates]) => ({ item, candidates })),
  );

  // 3. Compute per-line macros and the recipe rollup.
  const updates: Partial<RecipeIngredient>[] = [];
  const lines: MacroLine[] = [];
  let total: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  let matched = 0;

  for (const [index, ing] of recipe.recipe_ingredients.entries()) {
    const grams = gramsFor(ing, index);
    if (grams == null || grams <= 0) {
      skipped.push({ item: ing.item, reason: "no gram estimate" });
      lines.push({ item: ing.item, grams: null, match: null, kcal: null });
      continue;
    }

    // Reuse cached line macros unless forced or grams changed.
    if (!force && ing.macros && ing.grams === grams && ing.fdc_id) {
      total = addMacros(total, ing.macros);
      matched++;
      lines.push({
        item: ing.item,
        grams,
        match: `cached (FDC #${ing.fdc_id})`,
        kcal: ing.macros.kcal,
      });
      continue;
    }

    const match = matches.get(ing.item.toLowerCase().trim()) ?? null;
    if (!match) {
      skipped.push({ item: ing.item, reason: "no USDA match" });
      lines.push({ item: ing.item, grams, match: null, kcal: null });
      continue;
    }

    const lineMacros = roundMacros(scaleMacros(match.per_100g, grams));
    total = addMacros(total, lineMacros);
    matched++;
    lines.push({
      item: ing.item,
      grams,
      match: match.description,
      kcal: lineMacros.kcal,
    });
    updates.push({ id: ing.id, grams, fdc_id: match.fdc_id, macros: lineMacros });
  }

  if (matched === 0) {
    return {
      ok: false,
      error: "No ingredients could be matched — nothing to compute.",
    };
  }

  // 4. Persist per-line caches + the per-serving rollup.
  await Promise.all(
    updates.map(({ id, ...fields }) =>
      supabase.from("recipe_ingredients").update(fields).eq("id", id!),
    ),
  );

  const servings = recipe.servings || 1;
  const per_serving = roundMacros({
    kcal: total.kcal / servings,
    protein_g: total.protein_g / servings,
    carbs_g: total.carbs_g / servings,
    fat_g: total.fat_g / servings,
  });
  const { error } = await supabase
    .from("recipes")
    .update({ macros_per_serving: per_serving })
    .eq("id", recipeId);
  if (error) return { ok: false, error: `Failed to save macros: ${error.message}` };

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");

  return {
    ok: true,
    per_serving,
    matched,
    total: recipe.recipe_ingredients.length,
    lines,
    skipped,
  };
}
