import { createClient } from "@/lib/supabase/server";
import type { Macros, MealSlot } from "@/lib/types";

export type PlannedMealWithRecipe = {
  id: string;
  recipe_id: string;
  planned_on: string;
  meal_slot: MealSlot;
  servings: number;
  cooked: boolean;
  recipes: {
    title: string;
    macros_per_serving: Macros | null;
  };
};

/** Planned meals in [from, to], inclusive, with recipe title + macros. */
export async function listPlannedMeals(
  from: string,
  to: string,
): Promise<PlannedMealWithRecipe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planned_meals")
    .select(
      "id, recipe_id, planned_on, meal_slot, servings, cooked, recipes (title, macros_per_serving)",
    )
    .gte("planned_on", from)
    .lte("planned_on", to)
    .order("planned_on");

  if (error) throw new Error(`Failed to load meal plan: ${error.message}`);
  return (data ?? []) as unknown as PlannedMealWithRecipe[];
}

export type PlannedMealWithFullRecipe = {
  id: string;
  servings: number;
  recipes: {
    title: string;
    servings: number;
    recipe_ingredients: {
      item: string;
      quantity: number | null;
      unit: string | null;
      grams: number | null;
    }[];
  } | null;
};

/**
 * Planned meals in [from, to] with every ingredient of the recipe attached
 * (heavier than listPlannedMeals — only the shopping list needs this).
 */
export async function listPlannedMealsWithIngredients(
  from: string,
  to: string,
): Promise<PlannedMealWithFullRecipe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planned_meals")
    .select(
      "id, servings, recipes (title, servings, recipe_ingredients (item, quantity, unit, grams))",
    )
    .gte("planned_on", from)
    .lte("planned_on", to);

  if (error) throw new Error(`Failed to load meal plan: ${error.message}`);
  return (data ?? []) as unknown as PlannedMealWithFullRecipe[];
}

export type RecipeOption = { id: string; title: string };

export async function listRecipeOptions(): Promise<RecipeOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id, title")
    .order("title");

  if (error) throw new Error(`Failed to load recipes: ${error.message}`);
  return data ?? [];
}
