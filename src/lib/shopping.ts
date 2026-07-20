/**
 * Shopping list generation: aggregate ingredients across a week's planned
 * meals, scaled by servings, then subtract pantry staples — unless a staple
 * has a restock threshold and the week needs more than that amount.
 */

import { canonicalKey, covers } from "@/lib/fridge";
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
  /** True when this is a pantry staple that needs restocking (over threshold). */
  restock: boolean;
};

/** Expand each planned meal's recipe ingredients, scaled to planned servings. */
export function flattenPlannedMeals(
  planned: PlannedMealWithFullRecipe[],
): ShoppingIngredientInput[] {
  const out: ShoppingIngredientInput[] = [];

  for (const meal of planned) {
    const recipe = meal.recipes;
    if (!recipe) continue;

    const baseServings = recipe.servings || 1;
    const scale = (meal.servings || 1) / baseServings;

    for (const ing of recipe.recipe_ingredients) {
      if (!ing.item?.trim()) continue;
      out.push({
        item: ing.item,
        quantity: ing.quantity != null ? ing.quantity * scale : null,
        unit: ing.unit,
        grams: ing.grams != null ? ing.grams * scale : null,
        recipeTitle: recipe.title,
      });
    }
  }

  return out;
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
): { toBuy: ShoppingLine[]; covered: ShoppingLine[] } {
  type Group = {
    item: string;
    totalGrams: number;
    gramsKnownForAll: boolean;
    fragments: { qty: number | null; unit: string | null }[];
    recipeTitles: Set<string>;
  };

  const groups = new Map<string, Group>();

  for (const line of lines) {
    const key = canonicalKey(line.item);
    if (!key) continue;

    let g = groups.get(key);
    if (!g) {
      g = {
        item: line.item,
        totalGrams: 0,
        gramsKnownForAll: true,
        fragments: [],
        recipeTitles: new Set(),
      };
      groups.set(key, g);
    }

    if (line.grams != null) g.totalGrams += line.grams;
    else g.gramsKnownForAll = false;

    g.fragments.push({ qty: line.quantity, unit: line.unit });
    g.recipeTitles.add(line.recipeTitle);
  }

  const toBuy: ShoppingLine[] = [];
  const covered: ShoppingLine[] = [];

  for (const [key, g] of groups) {
    const totalGrams = g.gramsKnownForAll ? g.totalGrams : null;
    const line: ShoppingLine = {
      key,
      item: g.item,
      totalGrams,
      quantityDisplay: formatFragments(g.fragments),
      recipeTitles: [...g.recipeTitles],
      restock: false,
    };

    const match = pantry.find((p) => covers(p.name, g.item));

    if (!match) {
      toBuy.push(line);
      continue;
    }
    if (match.small_amount_g == null) {
      covered.push(line); // always assumed stocked, no threshold to check
      continue;
    }
    if (totalGrams != null && totalGrams > match.small_amount_g) {
      toBuy.push({ ...line, restock: true });
    } else {
      // Under threshold, or we can't estimate the amount — trust the pantry.
      covered.push(line);
    }
  }

  toBuy.sort((a, b) => a.item.localeCompare(b.item));
  covered.sort((a, b) => a.item.localeCompare(b.item));

  return { toBuy, covered };
}
