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

/**
 * What the sign-in form shows after a submission.
 *
 * Returned to the page rather than redirected into the URL as it used to be.
 * A redirect threw away everything typed, so a mistyped password meant
 * entering the username again too — and it put the failure in browser history
 * and server logs, which is a poor place for "wrong password".
 */
export type AuthState = {
  error?: string;
  message?: string;
  /**
   * Which input to mark. "credentials" covers both the identifier and the
   * password, because a wrong sign-in deliberately doesn't say which was
   * wrong — that's what stops the form being used to test whether an account
   * exists.
   */
  field?: "credentials" | "username" | "email" | "password";
};

function fail(error: string, field?: AuthState["field"]): AuthState {
  return { error, field };
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

async function login(formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));
  const identifier = ((formData.get("identifier") as string) ?? "").trim();
  const password = (formData.get("password") as string) ?? "";

  let email = identifier;

  if (!identifier.includes("@")) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // A config gap, not a wrong password — saying so avoids sending people
      // to reset a password that was fine.
      return fail(
        "Signing in by username isn't set up yet — use your email instead.",
        "credentials",
      );
    }
    const resolved = await emailForUsername(identifier.toLowerCase());
    if (!resolved) {
      // Same message either way, so this can't be used to test whether a
      // username exists.
      return fail("Those details didn't match an account.", "credentials");
    }
    email = resolved;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return fail("Those details didn't match an account.", "credentials");
  }

  revalidatePath("/", "layout");
  redirect(next);
}

async function signup(formData: FormData): Promise<AuthState> {
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
  if (weak) return fail(weak, "password");
  if (await isBreachedPassword(password)) {
    return fail(
      "That password has turned up in a known data breach — attackers try those first. Please pick another.",
      "password",
    );
  }

  if (!USERNAME_RE.test(username)) {
    return fail(
      "Usernames are 3–20 characters, using letters, numbers and underscores.",
      "username",
    );
  }

  // Profiles are publicly readable, so this check needs no elevated access.
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) return fail(`"${username}" is already taken.`, "username");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) return fail(error.message, "email");

  // With email confirmation on, there's no session until the link is clicked.
  if (!data.session) {
    return {
      message: "Check your email for a confirmation link, then sign in.",
    };
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

/**
 * The sign-in form's single entry point.
 *
 * One action rather than two because the form has one useActionState hook,
 * and which mode it's in is a detail of the submission, not of the page.
 */
export async function authenticate(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  return formData.get("mode") === "signup"
    ? signup(formData)
    : login(formData);
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
