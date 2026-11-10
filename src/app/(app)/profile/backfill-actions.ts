"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export type BackfillTarget = { id: string; title: string };

/**
 * The recipes a bulk macro run would touch.
 *
 * Listed up front rather than looped over on the server, because the work is
 * several API calls per recipe and a hundred recipes would run past any
 * sensible function timeout. The client walks this list one at a time
 * instead, which also means it can show progress and be stopped halfway.
 *
 * Own recipes only: Row Level Security would let this read other people's
 * shared ones, and spending the owner's API budget recomputing someone
 * else's recipe is nobody's idea of a backfill.
 */
export async function listRecipesForBackfill(
  mode: "missing" | "all",
): Promise<BackfillTarget[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  let query = supabase
    .from("recipes")
    .select("id, title, macros_per_serving")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (mode === "missing") query = query.is("macros_per_serving", null);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't list recipes: ${error.message}`);

  return (data ?? []).map((r) => ({ id: r.id, title: r.title as string }));
}
