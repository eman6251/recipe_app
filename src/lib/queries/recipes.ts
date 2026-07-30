import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CATEGORIES } from "@/lib/pantry";
import type {
  PantryCategory,
  PantryItem,
  Recipe,
  RecipeWithIngredients,
} from "@/lib/types";

export async function listRecipes(): Promise<Recipe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list recipes: ${error.message}`);
  return data;
}

export async function listRecipesWithIngredients(): Promise<
  RecipeWithIngredients[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients (*)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list recipes: ${error.message}`);
  return data;
}

export async function listPantryItems(): Promise<PantryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pantry_items")
    .select("*")
    .order("name");

  if (error) throw new Error(`Failed to load pantry: ${error.message}`);
  return data;
}

/**
 * Pantry categories, seeding the defaults the first time a user opens the
 * pantry so the page is never an empty shell.
 */
export async function listPantryCategories(): Promise<PantryCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pantry_categories")
    .select("*")
    .order("position")
    .order("name");

  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  if (data.length > 0) return data;

  const { data: seeded, error: seedError } = await supabase
    .from("pantry_categories")
    .insert(
      DEFAULT_CATEGORIES.map((name, position) => ({ name, position })),
    )
    .select();

  // A concurrent first load may have seeded already; fall back to a re-read.
  if (seedError) {
    const { data: retry } = await supabase
      .from("pantry_categories")
      .select("*")
      .order("position")
      .order("name");
    return retry ?? [];
  }
  return seeded ?? [];
}

export async function getRecipe(
  id: string,
): Promise<RecipeWithIngredients | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients (*)")
    .eq("id", id)
    .order("position", { referencedTable: "recipe_ingredients" })
    .maybeSingle();

  if (error) throw new Error(`Failed to load recipe: ${error.message}`);
  return data;
}
