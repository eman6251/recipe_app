/**
 * Shopping list generation: aggregate ingredients across a week's planned
 * meals, scaled by servings, then subtract pantry staples — unless the week
 * would run a staple down past its restock point.
 */

import { daysBetween } from "@/lib/dates";
import { canonicalKey, covers } from "@/lib/fridge";
import { packagingTare } from "@/lib/pantry";
import { formatQuantity } from "@/lib/quantity";
import type { PantryItem } from "@/lib/types";
import type { PlannedMealWithFullRecipe } from "@/lib/queries/planner";

export type ShoppingIngredientInput = {
  item: string;
  quantity: number | null;
  unit: string | null;
  grams: number | null;
  recipeTitle: string;
};

export type ShoppingLine = {
  key: string;
  item: string;
  /** Total estimated grams, or null if any contributing line lacked one. */
  totalGrams: number | null;
  /** Human-readable quantity, e.g. "3 tbsp + 1 cup" or "2 clove". */
  quantityDisplay: string;
  recipeTitles: string[];
  /** True when this is a pantry staple the week would run low on. */
  restock: boolean;
  /** Grams left after the week, when the staple's stock is tracked. */
  remainingGrams?: number | null;
  /** Why a pantry staple ended up on the buy list. */
  restockNote?: string;
  /** Distinct source names merged into this line, when more than one. */
  mergedFrom?: string[];
};

/**
 * How long one cook feeds you. Portions of a recipe within this many days of
 * the first one are that same batch; a portion further out is a fresh cook
 * that needs its own ingredients.
 *
 * Measured from the batch's start rather than portion to portion, so dragging
 * a meal past a couple of nights out doesn't split one cook into two — the
 * holes in a week are the whole reason drag-and-drop exists. The cost is that
 * cooking the same recipe twice inside a week reads as one batch; a week is
 * about as long as prepped food keeps, so that's the rarer case.
 */
const BATCH_SPAN_DAYS = 6;

/** One cook: the portions of a recipe eaten across consecutive-ish days. */
export type MealBatch = {
  recipe: NonNullable<PlannedMealWithFullRecipe["recipes"]>;
  /** The day it's assumed to have been cooked — its first planned portion. */
  cookedOn: string;
  /** The last day a portion of it is eaten. */
  lastDay: string;
  /** Every portion in the batch, including any falling outside the week. */
  portions: number;
  /** Ticked off as cooked on the calendar or week view. */
  cooked: boolean;
};

/**
 * Group planned portions into batches, one per trip to the stove.
 *
 * Meal prep cooks once and eats across days, so ingredients belong to the
 * cook, not to each plate. Portions of the same recipe on consecutive-ish
 * days are one batch; a longer gap starts another.
 */
export function groupIntoBatches(
  planned: PlannedMealWithFullRecipe[],
): MealBatch[] {
  const byRecipe = new Map<string, PlannedMealWithFullRecipe[]>();
  for (const meal of planned) {
    if (!meal.recipes) continue;
    const list = byRecipe.get(meal.recipe_id) ?? [];
    list.push(meal);
    byRecipe.set(meal.recipe_id, list);
  }

  const batches: MealBatch[] = [];

  for (const meals of byRecipe.values()) {
    const sorted = [...meals].sort((a, b) =>
      a.planned_on.localeCompare(b.planned_on),
    );

    let current: MealBatch | null = null;

    for (const meal of sorted) {
      if (
        !current ||
        daysBetween(current.cookedOn, meal.planned_on) > BATCH_SPAN_DAYS
      ) {
        current = {
          recipe: meal.recipes!,
          cookedOn: meal.planned_on,
          lastDay: meal.planned_on,
          portions: 0,
          cooked: false,
        };
        batches.push(current);
      }
      current.lastDay = meal.planned_on; // sorted, so the latest so far
      current.portions += meal.servings || 1;
      // Cooking is one event for the whole batch, so any portion marked
      // cooked means the ingredients were already bought.
      current.cooked ||= meal.cooked;
    }
  }

  return batches;
}

export type FlattenedPlan = {
  ingredients: ShoppingIngredientInput[];
  /** Batches left off because they were cooked before the week started. */
  carriedOver: { title: string; cookedOn: string; portions: number }[];
};

/**
 * Expand the batches you'll actually cook this week into ingredient lines.
 *
 * A batch's ingredients belong to the week it's cooked in — its first planned
 * day. Portions eaten this week from a batch cooked last week are leftovers
 * already sitting in the fridge, so listing their ingredients again just means
 * crossing them out at the store. The mirror of that: a batch cooked on
 * Saturday and eaten into next week is bought in full now.
 *
 * Aggregated per batch rather than per planned day. Scaling each day's portion
 * separately both over-counted (a recipe planned across more days kept adding
 * ingredients) and under-counted (a single portion of a four-serving recipe
 * bought a quarter of the ingredients, when you'd actually cook the whole
 * thing).
 */
export function flattenPlannedMeals(
  planned: PlannedMealWithFullRecipe[],
  /** The week being shopped for; portions outside it only inform batching. */
  week?: { from: string; to: string },
): FlattenedPlan {
  const out: ShoppingIngredientInput[] = [];
  const carriedOver: FlattenedPlan["carriedOver"] = [];

  for (const batch of groupIntoBatches(planned)) {
    if (week) {
      // Cooked after the week ends — that's next week's shop.
      if (batch.cookedOn > week.to) continue;

      const alreadyCooked = batch.cookedOn < week.from || batch.cooked;
      if (alreadyCooked) {
        // Only worth mentioning if you're actually eating it this week; the
        // window reaches back further than that to find where batches began.
        if (batch.lastDay >= week.from) {
          carriedOver.push({
            title: batch.recipe.title,
            cookedOn: batch.cookedOn,
            portions: batch.portions,
          });
        }
        continue;
      }
    }

    const { recipe } = batch;
    const baseServings = recipe.servings || 1;
    // Scales both ways: half the portions of a 14-sandwich recipe buys half
    // the ingredients. The planned portion count is the whole instruction —
    // if you wanted the full batch you'd have planned the full batch.
    const scale = batch.portions / baseServings;
    const title =
      scale !== 1 ? `${recipe.title} ×${formatQuantity(scale)}` : recipe.title;

    for (const ing of recipe.recipe_ingredients) {
      if (!ing.item?.trim()) continue;
      out.push({
        item: ing.item,
        quantity: ing.quantity != null ? ing.quantity * scale : null,
        unit: ing.unit,
        grams: ing.grams != null ? ing.grams * scale : null,
        recipeTitle: title,
      });
    }
  }

  return { ingredients: out, carriedOver };
}

/** Merge same-unit quantity fragments; different units are shown side by side. */
function formatFragments(
  fragments: { qty: number | null; unit: string | null }[],
): string {
  const byUnit = new Map<string, { qty: number; display: string }>();
  let hasUnquantified = false;

  for (const f of fragments) {
    if (f.qty == null) {
      hasUnquantified = true;
      continue;
    }
    const key = (f.unit ?? "").trim().toLowerCase();
    const existing = byUnit.get(key);
    if (existing) existing.qty += f.qty;
    else byUnit.set(key, { qty: f.qty, display: f.unit?.trim() ?? "" });
  }

  const parts = [...byUnit.values()].map(({ qty, display }) => {
    const q = formatQuantity(qty);
    return display ? `${q} ${display}` : q;
  });

  if (parts.length === 0) return hasUnquantified ? "as needed" : "";
  return parts.join(" + ") + (hasUnquantified ? " + more to taste" : "");
}

export function buildShoppingList(
  lines: ShoppingIngredientInput[],
  pantry: PantryItem[],
  /** key → canonical key, so synonyms land in one group (see queries/aliases). */
  aliases?: Map<string, string>,
): { toBuy: ShoppingLine[]; covered: ShoppingLine[] } {
  type Group = {
    item: string;
    totalGrams: number;
    gramsKnownForAll: boolean;
    fragments: { qty: number | null; unit: string | null }[];
    recipeTitles: Set<string>;
    sourceNames: Set<string>;
    spellings: string[];
  };

  const groups = new Map<string, Group>();

  for (const line of lines) {
    const rawKey = canonicalKey(line.item);
    if (!rawKey) continue;
    const key = aliases?.get(rawKey) ?? rawKey;

    let g = groups.get(key);
    if (!g) {
      g = {
        // Replaced below with the plainest of the merged spellings.
        item: key === rawKey ? line.item : key,
        totalGrams: 0,
        gramsKnownForAll: true,
        fragments: [],
        recipeTitles: new Set(),
        sourceNames: new Set(),
        spellings: [],
      };
      groups.set(key, g);
    }

    if (line.grams != null) g.totalGrams += line.grams;
    else g.gramsKnownForAll = false;

    g.fragments.push({ qty: line.quantity, unit: line.unit });
    g.recipeTitles.add(line.recipeTitle);
    g.sourceNames.add(line.item.trim().toLowerCase());
    g.spellings.push(line.item.trim());
  }

  const toBuy: ShoppingLine[] = [];
  const covered: ShoppingLine[] = [];

  for (const [key, g] of groups) {
    const totalGrams = g.gramsKnownForAll ? g.totalGrams : null;
    // Fewest words wins, so a merged group is labelled by its plain form
    // rather than by whichever recipe happened to be read first.
    const plainest = [...g.spellings].sort(
      (a, b) => a.split(/\s+/).length - b.split(/\s+/).length || a.length - b.length,
    )[0];
    const line: ShoppingLine = {
      key,
      item: plainest ?? g.item,
      totalGrams,
      quantityDisplay: formatFragments(g.fragments),
      recipeTitles: [...g.recipeTitles],
      restock: false,
      mergedFrom: g.sourceNames.size > 1 ? [...g.sourceNames] : undefined,
    };

    const match = pantry.find((p) => covers(p.name, g.item));

    if (!match) {
      toBuy.push(line);
      continue;
    }
    if (match.on_hand_g == null) {
      covered.push(line); // stock untracked — assumed always available
      continue;
    }
    if (totalGrams == null) {
      // Stock is tracked but this week's need can't be estimated, so there's
      // nothing to compare against; trust the pantry rather than guess.
      covered.push(line);
      continue;
    }

    // The weighed figure includes the jar or bag, so discount it before
    // deciding whether the week runs this staple out.
    const tare = packagingTare(match.category_name ?? null);
    const usable = Math.max(0, match.on_hand_g - tare);
    const remainingGrams = usable - totalGrams;

    if (remainingGrams <= 0) {
      toBuy.push({
        ...line,
        restock: true,
        remainingGrams,
        restockNote: `Pantry staple — about ${Math.round(usable)}g usable (${Math.round(match.on_hand_g)}g weighed, less ~${tare}g packaging) and this week needs ${Math.round(totalGrams)}g.`,
      });
    } else {
      covered.push({ ...line, remainingGrams });
    }
  }

  toBuy.sort((a, b) => a.item.localeCompare(b.item));
  covered.sort((a, b) => a.item.localeCompare(b.item));

  return { toBuy, covered };
}
