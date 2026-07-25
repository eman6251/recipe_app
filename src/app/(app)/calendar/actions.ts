"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDays, fromISODate, toISODate } from "@/lib/dates";
import type { MealSlot } from "@/lib/types";

function revalidatePlanner() {
  revalidatePath("/calendar");
  revalidatePath("/week");
  revalidatePath("/shopping");
}

export async function addPlannedMeal(input: {
  recipe_id: string;
  planned_on: string; // YYYY-MM-DD
  meal_slot: MealSlot;
  portions: number;
  /**
   * Meal-prep default: cooking N portions means eating one a day for N days,
   * so spread them across consecutive days instead of stacking them on one.
   */
  spread: boolean;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { recipe_id, meal_slot } = input;
  const portions = input.portions > 0 ? input.portions : 1;

  const rows =
    input.spread && portions > 1
      ? Array.from({ length: Math.round(portions) }, (_, i) => ({
          recipe_id,
          meal_slot,
          planned_on: toISODate(addDays(fromISODate(input.planned_on), i)),
          servings: 1,
        }))
      : [
          {
            recipe_id,
            meal_slot,
            planned_on: input.planned_on,
            servings: portions,
          },
        ];

  const { error } = await supabase.from("planned_meals").insert(rows);

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
