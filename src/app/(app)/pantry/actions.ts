"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addPantryItem(formData: FormData) {
  const name = (formData.get("name") as string)?.trim().toLowerCase();
  if (!name) return;

  const supabase = await createClient();
  // Upsert so re-adding an existing staple is a no-op instead of an error.
  await supabase
    .from("pantry_items")
    .upsert({ name }, { onConflict: "user_id,name", ignoreDuplicates: true });

  revalidatePath("/pantry");
  revalidatePath("/recipes");
}

export async function deletePantryItem(id: string) {
  const supabase = await createClient();
  await supabase.from("pantry_items").delete().eq("id", id);

  revalidatePath("/pantry");
  revalidatePath("/recipes");
}
