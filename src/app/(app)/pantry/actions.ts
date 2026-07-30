"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidatePantry() {
  revalidatePath("/pantry");
  revalidatePath("/recipes");
  revalidatePath("/shopping");
}

function parseGrams(raw: FormDataEntryValue | null): number | null {
  const s = (raw as string)?.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function addPantryItem(formData: FormData) {
  const name = (formData.get("name") as string)?.trim().toLowerCase();
  if (!name) return;

  const categoryRaw = (formData.get("category_id") as string)?.trim();

  const supabase = await createClient();
  // Upsert on (user_id, name) so re-adding an existing staple updates it
  // instead of erroring — the edit path for now.
  await supabase.from("pantry_items").upsert(
    {
      name,
      category_id: categoryRaw || null,
      on_hand_g: parseGrams(formData.get("on_hand_g")),
      restock_below_g: parseGrams(formData.get("restock_below_g")),
    },
    { onConflict: "user_id,name" },
  );

  revalidatePantry();
}

export async function updatePantryItem(
  id: string,
  fields: {
    on_hand_g?: number | null;
    restock_below_g?: number | null;
    category_id?: string | null;
  },
) {
  const supabase = await createClient();
  await supabase.from("pantry_items").update(fields).eq("id", id);
  revalidatePantry();
}

export async function deletePantryItem(id: string) {
  const supabase = await createClient();
  await supabase.from("pantry_items").delete().eq("id", id);
  revalidatePantry();
}

export async function addPantryCategory(formData: FormData) {
  const name = (formData.get("category_name") as string)?.trim();
  if (!name) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("pantry_categories")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);

  await supabase
    .from("pantry_categories")
    .upsert(
      { name, position: (data?.[0]?.position ?? 0) + 1 },
      { onConflict: "user_id,name", ignoreDuplicates: true },
    );

  revalidatePantry();
}

/** Items in a deleted category fall back to "uncategorized" (FK set null). */
export async function deletePantryCategory(id: string) {
  const supabase = await createClient();
  await supabase.from("pantry_categories").delete().eq("id", id);
  revalidatePantry();
}
