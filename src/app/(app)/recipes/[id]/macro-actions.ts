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
  isWaterSensitive,
  stateOf,
  type UsdaMatch,
} from "@/lib/usda";
import type { Macros, RecipeIngredient } from "@/lib/types";

export type MacroLine = {
  item: string;
  grams: number | null;
  /** USDA food description it matched, or null if skipped. */
  match: string | null;
  kcal: number | null;
  /**
   * Set when the ingredient and the entry it matched disagree about state —
   * drained chickpeas against a dry seed, dry pasta against a cooked bowl.
   * The costliest kind of wrong match and the hardest to notice, because the
   * food is right and only the water is missing.
   */
  stateWarning?: string;
  /**
   * The state this line was read as, when the line itself didn't say and the
   * answer matters. Not a warning — the assumption is usually right — but
   * the one thing you need shown to tell whether it was.
   */
  assumption?: string;
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

const GRAM_SYSTEM_PROMPT = `Estimate the total weight in grams of each ingredient line, using common culinary weights (1 tbsp olive oil ≈ 13.5g, 1 cup flour ≈ 120g, 1 medium onion ≈ 110g).

These numbers drive the whole nutrition calculation and one wrong line can dominate it, so:
- A named packaged product with no quantity means ONE standard retail package, not an unbounded amount. Use the real package size (a bag of Trader Joe's noodles is 16oz/454g, a can of beans 15oz/425g). Never inflate to "enough for the servings" — recipes are written around the package.
- Weigh things AS PURCHASED, in the state the line names: dry pasta dry, raw meat raw. Pasta more than doubles in weight when boiled, and that error alone can double a recipe's calories.
- Canned goods are weighed DRAINED unless the recipe clearly uses the liquid. A 15oz/425g can of beans or chickpeas drains to roughly 240g; a can of tomatoes is used whole. Giving the gross tin weight for something that gets rinsed overstates the line by most of half.
- Give the EDIBLE weight, not the weight of the thing in the shop. An avocado is about 150g of flesh from a 200g fruit; a lime yields 30g of juice; bone-in chicken thighs lose a third to the bone; a head of garlic is 40g of cloves. Weighing the stone, skin or bone into a recipe inflates that line by whatever you throw away.
- Sanity-check the total against the servings before answering. A main course lands near 350–550g per serving; if your numbers imply a kilo a head, one of them is wrong — usually the bulkiest carb.

Give your best estimate; use null only when genuinely impossible.`;

/**
 * Ask Claude for gram estimates for ingredient lines that lack them.
 *
 * Sent with the recipe's title, yield and full ingredient list, not just the
 * lines needing a number. A line judged on its own can't be sanity-checked
 * against anything — "1 package noodles" is only obviously wrong once you can
 * see it's meant to feed four people alongside a pound of beef.
 */
async function fillMissingGrams(
  lines: { index: number; text: string }[],
  context: { title: string; servings: number; allLines: string[] },
): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (lines.length === 0 || !process.env.ANTHROPIC_API_KEY) return out;

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      system: GRAM_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            `Recipe: ${context.title}`,
            `Makes ${context.servings} servings.`,
            "",
            "Full ingredient list, for context:",
            ...context.allLines.map((l) => `- ${l}`),
            "",
            "Estimate grams for these lines, by index:",
            ...lines.map((l) => `${l.index}: ${l.text}`),
          ].join("\n"),
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
        system: `For each recipe ingredient, pick the USDA food entry that best represents it nutritionally as used in home cooking.

Match the STATE of the ingredient, not just the food:
- The entry must describe the ingredient in the state the recipe weighs it. This matters more than any other consideration, because water is most of the difference between states.
- Canned, tinned, jarred, drained or pre-cooked ingredients must match a canned or cooked entry. Never match them to a raw or dry entry: "chickpeas, mature seeds, raw" is a dry seed at roughly 378 kcal/100g, while drained canned chickpeas are about 140 — picking the wrong one more than doubles that line.
- Dry pasta, rice, grains, lentils and flour, weighed as purchased, must match a dry or uncooked entry. A cooked entry against a dry weight undercounts by up to three times, for the same reason in reverse.
- Raw meat, fish and vegetables weighed as purchased match raw entries.
- When the ingredient doesn't say, assume as-purchased: raw for meat and vegetables, dry for pasta and grains.

Return null when no candidate is genuinely the same food in a usable state (a wrong-food or wrong-state match is worse than no match).`,
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
  /**
   * Re-ask for every line's gram weight, not just the blank ones.
   *
   * Normally a stored weight is left alone: it came from the importer when
   * the recipe was read, and re-guessing it on every recompute would make the
   * numbers wander. But that also means a bad weight is permanent, and a bad
   * weight is the single biggest source of error — one over-estimated line
   * can carry most of a recipe's calories. This re-estimates them against
   * the current prompt, which knows about package sizes and raw-versus-cooked
   * in a way the early one didn't.
   */
  reweigh = false,
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
    .filter(({ ing }) => reweigh || ing.grams == null || ing.grams <= 0);
  const lineText = (ing: RecipeIngredient) =>
    [ing.quantity, ing.unit, ing.item, ing.note && `(${ing.note})`]
      .filter(Boolean)
      .join(" ");

  const estimates = await fillMissingGrams(
    gramless.map(({ ing, index }) => ({ index, text: lineText(ing) })),
    {
      title: recipe.title,
      servings: recipe.servings || 1,
      allLines: recipe.recipe_ingredients.map(lineText),
    },
  );

  // When reweighing, the fresh estimate wins; otherwise it only fills a gap.
  // A changed weight invalidates the cached line macros on its own, since
  // the reuse check below compares the stored grams against this.
  const gramsFor = (ing: RecipeIngredient, index: number) =>
    (reweigh
      ? (estimates.get(index) ?? ing.grams)
      : (ing.grams ?? estimates.get(index))) ?? null;

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

    const wanted = stateOf(ing.item);
    const got = stateOf(match.description);
    const mismatched = wanted !== "unstated" && got !== "unstated" && wanted !== got;

    /*
     * Say which way an unstated grain was read.
     *
     * "Jasmine rice" with no further word is taken as dry, because that's
     * how a recipe weighs what you tip out of the bag — and at 356 kcal per
     * 100g against a cooked 130, being wrong about it is worth a couple of
     * hundred calories a serving. The assumption is usually right and is
     * never going to be visible from the total, so it's printed.
     */
    const density = grams > 0 ? (lineMacros.kcal / grams) * 100 : 0;
    const assumption =
      wanted === "unstated" && isWaterSensitive(ing.item)
        ? density >= 250
          ? "read as dry weight — write “cooked” into the ingredient if it isn’t"
          : density > 0 && density < 200
            ? "read as cooked weight — write “dry” into the ingredient if it isn’t"
            : undefined
        : undefined;

    lines.push({
      item: ing.item,
      grams,
      match: match.description,
      kcal: lineMacros.kcal,
      stateWarning: mismatched
        ? wanted === "hydrated"
          ? "matched a dry entry — likely far too high"
          : "matched a prepared entry — likely far too low"
        : undefined,
      assumption,
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
  // Built field by field, which is how fibre went missing from the recipe
  // total while being present on every ingredient under it. Anything added
  // to Macros has to be added here too.
  const per_serving = roundMacros({
    kcal: total.kcal / servings,
    protein_g: total.protein_g / servings,
    carbs_g: total.carbs_g / servings,
    fat_g: total.fat_g / servings,
    fiber_g: total.fiber_g != null ? total.fiber_g / servings : null,
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

/**
 * Re-total a recipe from the per-ingredient macros already stored on it.
 *
 * No USDA, no Claude, no cost. Every ingredient keeps its own computed
 * macros, so when the recipe-level total turns out to be missing something
 * the ingredients had all along — as fibre was — the fix is arithmetic
 * rather than another paid pass over the whole recipe box.
 */
export async function rollUpStoredMacros(
  recipeId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("servings, recipe_ingredients (macros)")
    .eq("id", recipeId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!recipe) return { ok: false, error: "Recipe not found." };

  const lines = (recipe.recipe_ingredients ?? []) as { macros: Macros | null }[];
  const computed = lines.filter((l) => l.macros);
  if (computed.length === 0) {
    return { ok: false, error: "No computed ingredients to total." };
  }

  let total: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: null };
  for (const line of computed) total = addMacros(total, line.macros!);

  const servings = (recipe.servings as number) || 1;
  const per_serving = roundMacros({
    kcal: total.kcal / servings,
    protein_g: total.protein_g / servings,
    carbs_g: total.carbs_g / servings,
    fat_g: total.fat_g / servings,
    fiber_g: total.fiber_g != null ? total.fiber_g / servings : null,
  });

  const { error: saveError } = await supabase
    .from("recipes")
    .update({ macros_per_serving: per_serving })
    .eq("id", recipeId);
  if (saveError) return { ok: false, error: saveError.message };

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/week");
  return { ok: true };
}
