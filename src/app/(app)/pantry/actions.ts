"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addPantryItem(formData: FormData) {
  const name = (formData.get("name") as string)?.trim().toLowerCase();
  if (!name) return;

  const thresholdRaw = (formData.get("threshold") as string)?.trim();
  const threshold = thresholdRaw ? Number(thresholdRaw) : null;
  const small_amount_g = threshold && threshold > 0 ? threshold : null;

  const supabase = await createClient();
  // Upsert on (user_id, name) so re-adding an existing staple updates its
  // threshold instead of erroring — the edit path for now.
  await supabase
    .from("pantry_items")
    .upsert({ name, small_amount_g }, { onConflict: "user_id,name" });

  revalidatePath("/pantry");
  revalidatePath("/recipes");
  revalidatePath("/shopping");
}

export async function deletePantryItem(id: string) {
  const supabase = await createClient();
  await supabase.from("pantry_items").delete().eq("id", id);

  revalidatePath("/pantry");
  revalidatePath("/recipes");
  revalidatePath("/shopping");
}
