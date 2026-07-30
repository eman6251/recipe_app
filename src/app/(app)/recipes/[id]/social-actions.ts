"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setRecipeShared(recipeId: string, isPublic: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({ is_public: isPublic })
    .eq("id", recipeId);
  if (error) return { error: error.message };

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/");
  return {};
}

export async function setRecipeFavorite(recipeId: string, favorite: boolean) {
  const supabase = await createClient();

  const { error } = favorite
    ? await supabase.from("recipe_favorites").upsert({ recipe_id: recipeId })
    : await supabase
        .from("recipe_favorites")
        .delete()
        .eq("recipe_id", recipeId);

  if (error) return { error: error.message };

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");
  revalidatePath("/");
  return {};
}

export async function rateRecipe(recipeId: string, rating: number) {
  if (rating < 1 || rating > 5) return { error: "Invalid rating." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("recipe_ratings")
    .upsert({ recipe_id: recipeId, rating }, { onConflict: "user_id,recipe_id" });
  if (error) return { error: error.message };

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/");
  return {};
}

/**
 * Record that the signed-in user opened this recipe. Fire-and-forget from the
 * detail page — a failure here should never break rendering a recipe.
 */
export async function recordRecipeView(recipeId: string) {
  try {
    const supabase = await createClient();
    await supabase
      .from("recipe_views")
      .upsert(
        { recipe_id: recipeId, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,recipe_id" },
      );
  } catch {
    // ignored
  }
}
