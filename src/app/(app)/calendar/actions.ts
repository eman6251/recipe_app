"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MealSlot } from "@/lib/types";

function revalidatePlanner() {
  revalidatePath("/calendar");
  revalidatePath("/week");
}

export async function addPlannedMeal(input: {
  recipe_id: string;
  planned_on: string; // YYYY-MM-DD
  meal_slot: MealSlot;
  servings: number;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("planned_meals").insert({
    recipe_id: input.recipe_id,
    planned_on: input.planned_on,
    meal_slot: input.meal_slot,
    servings: input.servings > 0 ? input.servings : 1,
  });

  if (error) return { error: error.message };
  revalidatePlanner();
  return {};
}

export async function deletePlannedMeal(id: string) {
  const supabase = await createClient();
  await supabase.from("planned_meals").delete().eq("id", id);
  revalidatePlanner();
}

export async function setMealCooked(id: string, cooked: boolean) {
  const supabase = await createClient();
  await supabase.from("planned_meals").update({ cooked }).eq("id", id);
  revalidatePlanner();
}
