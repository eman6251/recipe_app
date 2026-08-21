"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Note that this person has been offered the walkthrough.
 *
 * Written whether they took it or dismissed it — the flag records that they
 * were asked, not that they watched. Asking twice is the annoying failure.
 */
export async function markTourSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ tour_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}

/**
 * A recipe of the viewer's own for the tour to open.
 *
 * Has to be one they own: the macro button only renders for the owner, so
 * pointing the tour at someone else's shared recipe would arrow at nothing.
 * Newest first, on the grounds that it's the one they'll recognise.
 */
export async function getTourRecipeId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("recipes")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}
