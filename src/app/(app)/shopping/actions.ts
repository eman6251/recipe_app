"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Choose whether a batch is shopped for at full recipe or at planned portions.
 *
 * Written across the batch's whole date range rather than to a single row: one
 * cook produces all those portions, so buying for half of it and not the other
 * half would be meaningless. The range comes from the batch the shopping list
 * already worked out, so the two always agree on where a cook starts and ends.
 */
export async function setBatchScale(
  recipeId: string,
  from: string,
  to: string,
  scaleToPortions: boolean,
): Promise<{ error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { error: "Bad date range." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("planned_meals")
    .update({ scale_to_portions: scaleToPortions })
    .eq("recipe_id", recipeId)
    .gte("planned_on", from)
    .lte("planned_on", to);

  if (error) return { error: error.message };

  revalidatePath("/shopping");
  return {};
}
