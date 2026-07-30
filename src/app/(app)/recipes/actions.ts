"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { IngredientInput } from "@/lib/types";

export type RecipePayload = {
  title: string;
  description: string | null;
  source_url: string | null;
  source_note: string | null;
  servings: number;
  prep_minutes: number | null;
  cook_minutes: number | null;
  instructions: string[];
  notes: string | null;
  tags: string[];
  ingredients: IngredientInput[];
};

function cleanIngredients(ingredients: IngredientInput[]) {
  return ingredients
    .filter((ing) => ing.item.trim().length > 0)
    .map((ing, position) => ({
      position,
      group_name: ing.group_name?.trim() || null,
      quantity: ing.quantity,
      unit: ing.unit?.trim() || null,
      item: ing.item.trim(),
      note: ing.note?.trim() || null,
      grams: ing.grams ?? null,
      fdc_id: ing.fdc_id ?? null,
      macros: ing.macros ?? null,
    }));
}

export async function createRecipe(payload: RecipePayload) {
  const supabase = await createClient();
  const { ingredients, ...recipe } = payload;

  const { data: created, error } = await supabase
    .from("recipes")
    .insert(recipe)
    .select("id")
    .single();

  if (error) return { error: error.message };

  const rows = cleanIngredients(ingredients).map((ing) => ({
    ...ing,
    recipe_id: created.id,
  }));

  if (rows.length > 0) {
    const { error: ingError } = await supabase
      .from("recipe_ingredients")
      .insert(rows);
    if (ingError) return { error: ingError.message };
  }

  revalidatePath("/recipes");
  redirect(`/recipes/${created.id}`);
}

export async function updateRecipe(id: string, payload: RecipePayload) {
  const supabase = await createClient();
  const { ingredients, ...recipe } = payload;

  const { error } = await supabase.from("recipes").update(recipe).eq("id", id);
  if (error) return { error: error.message };

  // Simplest correct approach: replace the ingredient rows wholesale.
  const { error: delError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", id);
  if (delError) return { error: delError.message };

  const rows = cleanIngredients(ingredients).map((ing) => ({
    ...ing,
    recipe_id: id,
  }));

  if (rows.length > 0) {
    const { error: ingError } = await supabase
      .from("recipe_ingredients")
      .insert(rows);
    if (ingError) return { error: ingError.message };
  }

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadRecipeImage(
  recipeId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick an image first." };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: "Use a JPEG, PNG, or WebP image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "That image is over 8MB — try a smaller one." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  // Keyed by user id so storage policies can check ownership from the path.
  const path = `${user.id}/${recipeId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("recipe-images")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("recipe-images").getPublicUrl(path);

  // Bust the CDN cache when a photo is replaced at the same path.
  const url = `${publicUrl}?v=${Date.now()}`;
  const { error } = await supabase
    .from("recipes")
    .update({ image_url: url })
    .eq("id", recipeId);
  if (error) return { error: error.message };

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");
  return {};
}

export async function removeRecipeImage(
  recipeId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Extension isn't tracked on the recipe, so clear all candidates.
  await supabase.storage
    .from("recipe-images")
    .remove(["jpg", "png", "webp"].map((e) => `${user.id}/${recipeId}.${e}`));

  const { error } = await supabase
    .from("recipes")
    .update({ image_url: null })
    .eq("id", recipeId);
  if (error) return { error: error.message };

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");
  return {};
}

export async function deleteRecipe(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/recipes");
  redirect("/recipes");
}
