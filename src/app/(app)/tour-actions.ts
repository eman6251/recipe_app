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
