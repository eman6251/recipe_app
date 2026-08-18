"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validatePassword } from "@/lib/password";
import { isBreachedPassword } from "@/lib/password-breach";
import { RECOVERY_COOKIE } from "@/lib/recovery";

function fail(message: string): never {
  redirect(`/reset-password?error=${encodeURIComponent(message)}`);
}

/**
 * Set a new password for the signed-in user.
 *
 * The same rules as sign-up, deliberately — a reset is the one path that could
 * otherwise walk a strong password back down to a weak one, and Supabase's own
 * minimum is the only thing guarding it.
 */
export async function updatePassword(formData: FormData) {
  const password = (formData.get("password") as string) ?? "";
  const confirm = (formData.get("confirm") as string) ?? "";
  const currentPassword = (formData.get("current_password") as string) ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const jar = await cookies();
  const fromRecoveryLink = jar.get(RECOVERY_COOKIE)?.value === "1";

  // A session alone isn't proof of identity — a borrowed laptop has one. If
  // this isn't a fresh reset link, the current password stands in for it.
  if (!fromRecoveryLink) {
    if (!currentPassword) fail("Enter your current password.");
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (error) fail("That current password isn't right.");
  }

  if (password !== confirm) fail("Those two passwords don't match.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const weak = validatePassword(password, {
    username: profile?.username ?? undefined,
    email: user.email,
  });
  if (weak) fail(weak);

  if (await isBreachedPassword(password)) {
    fail(
      "That password has turned up in a known data breach — attackers try those first. Please pick another.",
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) fail(error.message);

  // Spent — the receipt shouldn't outlive the reset it was issued for.
  jar.delete(RECOVERY_COOKIE);

  revalidatePath("/", "layout");
  redirect("/reset-password?done=1");
}
