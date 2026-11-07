"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Ticks live on the server so a phone and a laptop agree about the basket.
 *
 * Deliberately no revalidatePath: the client already moved the checkbox and
 * is right about it. Re-rendering the page under someone mid-aisle to tell
 * them what they just did would be slower and would fight the optimistic
 * update for no gain.
 */
export async function setItemChecked(
  itemKey: string,
  checked: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = checked
    ? await supabase.from("shopping_checks").upsert({ item_key: itemKey })
    : await supabase.from("shopping_checks").delete().eq("item_key", itemKey);

  return error ? { error: error.message } : {};
}

/** Clear the whole list's ticks — the "start a new shop" button. */
export async function resetChecks(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("shopping_checks")
    .delete()
    .eq("user_id", user.id);

  return error ? { error: error.message } : {};
}
