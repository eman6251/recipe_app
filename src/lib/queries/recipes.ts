import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CATEGORIES } from "@/lib/pantry";
import type {
  PantryCategory,
  PantryItem,
  Recipe,
  RecipeWithIngredients,
} from "@/lib/types";

/**
 * The signed-in user's id. Recipe reads are filtered by this explicitly:
 * RLS also permits reading other people's *shared* recipes, so "my recipes"
 * views would otherwise fill up with everyone else's.
 */
export async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function listRecipes(): Promise<Recipe[]> {
  const supabase = await createClient();
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list recipes: ${error.message}`);
  return data;
}

/**
 * The user's recipe box: everything they wrote, plus shared recipes they
 * saved. Other people's shared recipes stay out until favorited.
 */
export async function listRecipesWithIngredients(): Promise<
  RecipeWithIngredients[]
> {
  const supabase = await createClient();
  const userId = await currentUserId();
  if (!userId) return [];

  const [{ data: own, error }, { data: favorites }] = await Promise.all([
    supabase
      .from("recipes")
      .select("*, recipe_ingredients (*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("recipe_favorites").select("recipe_id"),
  ]);

  if (error) throw new Error(`Failed to list recipes: ${error.message}`);

  const savedIds = (favorites ?? [])
    .map((f) => f.recipe_id)
    .filter((id) => !own?.some((r) => r.id === id));
  if (savedIds.length === 0) return own ?? [];

  const { data: saved } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients (*)")
    .in("id", savedIds)
    .order("created_at", { ascending: false });

  return [...(own ?? []), ...(saved ?? [])];
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
