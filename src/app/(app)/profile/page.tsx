import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { updateProfile } from "./actions";
import { AvatarUpload } from "./avatar-upload";

const inputClass =
  "rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15";

/**
 * Who you are. Targets, defaults and the bulk tools moved to /settings when
 * the avatar menu grew an entry for each — one page holding both a display
 * name and a billable macro recomputation was really two pages.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // Thrown rather than swallowed: an empty form looks exactly like an account
  // nobody has filled in, and saving from there writes the blanks back over a
  // real username.
  if (profileError) {
    throw new Error(`Couldn't load your profile: ${profileError.message}`);
  }

  return (
    <>
      <PageHeader
        title="My profile"
        description="How you show up on recipes you share."
        info={
          <>
            Your display name and photo appear as the author on any recipe you
            share — your email never does. Your username is also what you can
            sign in with, instead of the email. Targets, defaults and the
            walkthrough live under <strong>Settings</strong>.
          </>
        }
      />

      <section className="flex max-w-xl flex-col gap-6 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10">
        <AvatarUpload avatarUrl={profile?.avatar_url ?? null} />

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            {message}
          </p>
        ) : null}

        <form action={updateProfile} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Username</span>
            <input
              name="username"
              defaultValue={profile?.username ?? ""}
              required
              pattern="[a-zA-Z0-9_]{3,20}"
              className={inputClass}
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Letters, numbers and underscores. You can sign in with this
              instead of your email.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Display name</span>
            <input
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
              required
              maxLength={60}
              className={inputClass}
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Shown as the author on recipes you share. Your email never is.
            </span>
          </label>

          <div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-300"
            >
              Save profile
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-4 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          <span>Signed in as {user?.email}</span>
          <Link
            href="/reset-password"
            className="font-medium text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
          >
            Change password
          </Link>
        </div>
      </section>
    </>
  );
}
