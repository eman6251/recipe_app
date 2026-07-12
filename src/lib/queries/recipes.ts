import { createClient } from "@/lib/supabase/server";
import type { PantryItem, Recipe, RecipeWithIngredients } from "@/lib/types";

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
