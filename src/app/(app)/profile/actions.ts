"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function updateProfile(formData: FormData) {
  const displayName = (formData.get("display_name") as string)?.trim();
  const username = ((formData.get("username") as string) ?? "")
    .trim()
    .toLowerCase();
  const shareNew = formData.get("share_new_recipes") === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (username && !USERNAME_RE.test(username)) {
    redirect(
      "/profile?error=" +
        encodeURIComponent(
          "Usernames are 3–20 characters, using letters, numbers and underscores.",
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

  await supabase
    .from("profiles")
    .update({
      ...(username ? { username } : {}),
      ...(displayName ? { display_name: displayName } : {}),
      share_new_recipes: shareNew,
    })
    .eq("id", user.id);

  revalidatePath("/profile");
  revalidatePath("/");
  redirect("/profile?message=" + encodeURIComponent("Profile saved."));
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
  return {};
}
