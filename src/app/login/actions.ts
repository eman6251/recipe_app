"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { validatePassword } from "@/lib/password";
import { isBreachedPassword } from "@/lib/password-breach";
import { siteUrl } from "@/lib/site-url";

/** Only same-site paths, so a crafted ?next= can't bounce users off-site. */
function safeNext(raw: FormDataEntryValue | null): string {
  const next = (raw as string) ?? "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function fail(message: string, next: string): never {
  redirect(
    `/login?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
  );
}

/**
 * Resolve a username to the address its account signs in with.
 *
 * Supabase authenticates on email, so signing in by username needs that
 * mapping — and it deliberately isn't reachable from the browser: profiles
 * are public, so an email column there would undo the whole point of
 * usernames. The lookup runs here with the service key, which never leaves
 * the server, and returns only into the sign-in call below.
 */
async function emailForUsername(username: string): Promise<string | null> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return null;

  const { data } = await admin.auth.admin.getUserById(profile.id);
  return data.user?.email ?? null;
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));
  const identifier = ((formData.get("identifier") as string) ?? "").trim();
  const password = (formData.get("password") as string) ?? "";

  let email = identifier;

  if (!identifier.includes("@")) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // A config gap, not a wrong password — saying so avoids sending people
      // to reset a password that was fine.
      fail("Signing in by username isn't set up yet — use your email.", next);
    }
    const resolved = await emailForUsername(identifier.toLowerCase());
    if (!resolved) {
      // Same message either way, so this can't be used to test whether a
      // username exists.
      fail("Those details didn't match an account.", next);
    }
    email = resolved;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fail("Those details didn't match an account.", next);

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));
  const email = ((formData.get("email") as string) ?? "").trim();
  const username = ((formData.get("username") as string) ?? "")
    .trim()
    .toLowerCase();
  const password = (formData.get("password") as string) ?? "";

  // Checked here as well as in the browser — the form is only a courtesy,
  // and this action is reachable without it.
  const weak = validatePassword(password, { username, email });
  if (weak) fail(weak, next);
  if (await isBreachedPassword(password)) {
    fail(
      "That password has turned up in a known data breach — attackers try those first. Please pick another.",
      next,
    );
  }

  if (!USERNAME_RE.test(username)) {
    fail(
      "Usernames are 3–20 characters, using letters, numbers and underscores.",
      next,
    );
  }

  // Profiles are publicly readable, so this check needs no elevated access.
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) fail(`"${username}" is already taken.`, next);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) fail(error.message, next);

  // With email confirmation on, there's no session until the link is clicked.
  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent(
        "Check your email for a confirmation link, then sign in.",
      )}`,
    );
  }

  revalidatePath("/", "layout");
  redirect(next);
}

/**
 * Email a password-reset link.
 *
 * Always reports the same thing, whether or not that address has an account.
 * Anything else turns this form into a way to test which of your friends and
 * family are on the app.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = ((formData.get("email") as string) ?? "").trim();
  const sent =
    "If that address has an account, a reset link is on its way. The link is good for one hour.";

  if (!email.includes("@")) {
    redirect(`/login/forgot?message=${encodeURIComponent(sent)}`);
  }

  const supabase = await createClient();
  const origin = await siteUrl();

  // Land on the confirm route, which verifies the token and sets the session
  // before handing off to the page that takes the new password.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  redirect(`/login/forgot?message=${encodeURIComponent(sent)}`);
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
