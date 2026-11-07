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
  recipeId: string;
  recipe: NonNullable<PlannedMealWithFullRecipe["recipes"]>;
  /** The day it's assumed to have been cooked — its first planned portion. */
  cookedOn: string;
  /** The last day a portion of it is eaten. */
  lastDay: string;
  /** Every portion in the batch, including any falling outside the week. */
  portions: number;
  /** Ticked off as cooked on the calendar or week view. */
  cooked: boolean;
  /** Buy for the portions planned rather than for the whole recipe. */
  scaleToPortions: boolean;
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
          recipeId: meal.recipe_id,
          recipe: meal.recipes!,
          cookedOn: meal.planned_on,
          lastDay: meal.planned_on,
          portions: 0,
          cooked: false,
          scaleToPortions: false,
        };
        batches.push(current);
      }
      current.lastDay = meal.planned_on; // sorted, so the latest so far
      current.portions += meal.servings || 1;
      // Cooking is one event for the whole batch, so any portion marked
      // cooked means the ingredients were already bought.
      current.cooked ||= meal.cooked;
      // The choice belongs to the cook, so any row carrying it sets it for
      // the whole batch — that's how the action writes it back, too.
      current.scaleToPortions ||= meal.scale_to_portions;
    }
  }

  return batches;
}

/**
 * A batch planned for fewer portions than the recipe yields, where the two
 * readings genuinely differ and only the cook knows which is meant.
 */
export type PortionChoice = {
  recipeId: string;
  title: string;
  /** First planned day — identifies which cook this is. */
  cookedOn: string;
  lastDay: string;
  plannedPortions: number;
  recipeServings: number;
  /** False means the list currently holds the full recipe. */
  scaleToPortions: boolean;
};

export type FlattenedPlan = {
  ingredients: ShoppingIngredientInput[];
  /** Why batches were left off, for a one-line account of the omissions. */
  skipped: {
    /** Ticked as cooked. */
    cooked: number;
    /** Due to be cooked on a day that has passed. */
    past: number;
  };
  /** Under-filled batches, for the "whole recipe or just these?" prompt. */
  choices: PortionChoice[];
};

/**
 * Expand every batch you haven't cooked yet into ingredient lines.
 *
 * Not divided by week, deliberately. A shopping list is a trip, and a trip
 * doesn't respect Sunday: prepping on a Saturday with one more dish to cook
 * on the Sunday is one shop, and splitting it across two weekly lists meant
 * going to the shop twice or merging them in your head. What decides whether
 * something is on the list is whether it's been cooked, not which calendar
 * week it landed in.
 *
 * Aggregated per batch rather than per planned day. Scaling each day's portion
 * separately both over-counted (a recipe planned across more days kept adding
 * ingredients) and under-counted (a single portion of a four-serving recipe
 * bought a quarter of the ingredients, when you'd actually cook the whole
 * thing).
 */
export function flattenPlannedMeals(
  planned: PlannedMealWithFullRecipe[],
  /** Today, as YYYY-MM-DD. Cooks before this are behind you. */
  today: string,
): FlattenedPlan {
  const out: ShoppingIngredientInput[] = [];
  const choices: PortionChoice[] = [];
  const skipped = { cooked: 0, past: 0 };

  for (const batch of groupIntoBatches(planned)) {
    if (batch.cooked) {
      skipped.cooked++;
      continue;
    }

    /*
     * A cook day that has already gone is behind you whether or not anyone
     * ticked it, and the tick has only ever been optional. Without this, a
     * history of not ticking things off piles every meal ever planned onto
     * the list, which is worse than useless — it buries the fortnight you
     * actually need to shop for.
     *
     * Judged on the cook day rather than the last day it's eaten: you shop
     * for a cook, and a cook in the past is either done or abandoned.
     */
    if (batch.cookedOn < today) {
      skipped.past++;
      continue;
    }

    const { recipe } = batch;
    const baseServings = recipe.servings || 1;
    const planned = batch.portions / baseServings;

    /*
     * Scaling up is unambiguous — eight portions of a four-serving recipe is
     * two batches, so buy twice.
     *
     * Scaling down isn't, and defaults to the whole recipe. Planning one
     * dinner from a recipe that makes four rarely means buying a quarter of
     * the ingredients; you cook the pot and eat the rest. But some recipes
     * genuinely halve — seven of fourteen sandwiches — and only the cook
     * knows which this is, so the reduction is offered rather than assumed.
     */
    const underFilled = planned < 1;
    if (underFilled) {
      choices.push({
        recipeId: batch.recipeId,
        title: recipe.title,
        cookedOn: batch.cookedOn,
        lastDay: batch.lastDay,
        plannedPortions: batch.portions,
        recipeServings: baseServings,
        scaleToPortions: batch.scaleToPortions,
      });
    }

    const scale = underFilled && !batch.scaleToPortions ? 1 : planned;
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

  return { ingredients: out, skipped, choices };
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
