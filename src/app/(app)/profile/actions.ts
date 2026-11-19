"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/**
 * Who you are: the name and handle other people see.
 *
 * Split from the preferences below when the two moved to separate pages.
 * Each action writes only its own fields, so saving a display name can't
 * blank a calorie goal that wasn't on the form.
 */
export async function updateProfile(formData: FormData) {
  const displayName = (formData.get("display_name") as string)?.trim();
  const username = ((formData.get("username") as string) ?? "")
    .trim()
    .toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (username && !USERNAME_RE.test(username)) {
    redirect(
      "/profile?error=" +
        encodeURIComponent(
          "Usernames are 3\u201320 characters, using letters, numbers and underscores.",
        ),
    );
  }

  if (username) {
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .maybeSingle();
    if (taken) {
      redirect(
        "/profile?error=" + encodeURIComponent(`"${username}" is already taken.`),
      );
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      ...(username ? { username } : {}),
      ...(displayName ? { display_name: displayName } : {}),
    })
    .eq("id", user.id);

  // A failed write used to redirect to "Profile saved." all the same, which
  // is the worst thing a save button can do: the next page load shows the old
  // values and the only available explanation is that you imagined typing.
  if (error) {
    redirect(
      "/profile?error=" +
        encodeURIComponent(`Couldn't save your profile: ${error.message}`),
    );
  }

  revalidatePath("/profile");
  revalidatePath("/");
  redirect("/profile?message=" + encodeURIComponent("Profile saved."));
}

/** How the app behaves: targets and defaults, rather than identity. */
export async function updatePreferences(formData: FormData) {
  const shareNew = formData.get("share_new_recipes") === "on";

  // Blank clears the goal rather than storing zero \u2014 "not counting" and
  // "counting, target zero" are different states and only one is meaningful.
  const goalRaw = ((formData.get("daily_calorie_goal") as string) ?? "").trim();
  const goalNumber = goalRaw ? Number(goalRaw) : null;
  if (
    goalNumber !== null &&
    (!Number.isFinite(goalNumber) || goalNumber < 500 || goalNumber > 10000)
  ) {
    redirect(
      "/settings?error=" +
        encodeURIComponent("Daily calorie goal should be between 500 and 10,000."),
    );
  }
  const dailyCalorieGoal = goalNumber === null ? null : Math.round(goalNumber);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({ share_new_recipes: shareNew })
    .eq("id", user.id);
  if (error) {
    redirect(
      "/settings?error=" +
        encodeURIComponent(`Couldn't save your settings: ${error.message}`),
    );
  }

  /*
   * The goal is written on its own, after the setting that always exists.
   *
   * Its column arrived in a later migration, and a database that hasn't had
   * that run yet would reject the whole statement if the two were folded
   * together \u2014 losing the sharing default along with it.
   */
  const { error: goalError } = await supabase
    .from("profiles")
    .update({ daily_calorie_goal: dailyCalorieGoal })
    .eq("id", user.id);

  revalidatePath("/settings");
  revalidatePath("/week");
  revalidatePath("/");

  if (goalError) {
    redirect(
      "/settings?error=" +
        encodeURIComponent(
          `Everything else saved, but not the calorie goal: ${goalError.message}`,
        ),
    );
  }

  redirect("/settings?message=" + encodeURIComponent("Settings saved."));
}

/** Records an avatar already uploaded to storage by the browser. */
export async function setAvatar(url: string): Promise<{ error?: string }> {
  const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/`;
  if (url && !url.startsWith(expectedPrefix)) {
    return { error: "Unexpected image location." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url || null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/week");
  return {};
}
