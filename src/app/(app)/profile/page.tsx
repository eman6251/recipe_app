import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { updateProfile } from "./actions";
import { AvatarUpload } from "./avatar-upload";
import { ThemePicker } from "@/components/theme-picker";
import { TourButton } from "@/components/tour/tour-button";
import { MacroBackfill } from "./macro-backfill";
import { THEME_COOKIE, isThemeChoice } from "@/lib/theme";

const inputClass =
  "rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  const themeChoice = isThemeChoice(stored) ? stored : "system";

  /*
   * Two reads, not one, and the split is the point.
   *
   * The identity fields are thrown on if they fail: discarding that error
   * renders every box empty, which looks exactly like an account nobody has
   * filled in, and saving from there would write the blanks back over a real
   * username.
   *
   * The calorie goal is fetched apart from them because it's optional and,
   * until its migration is run, absent — and PostgREST fails a whole select
   * over one unknown column. Asking for it separately means a column that
   * isn't there yet costs you that one field instead of the entire page.
   */
  const [
    { data: profile, error: profileError },
    { data: goalRow, error: goalError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, share_new_recipes")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("daily_calorie_goal")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
  ]);

  if (profileError) {
    throw new Error(`Couldn't load your profile: ${profileError.message}`);
  }

  const goalAvailable = !goalError;

  return (
    <>
      <PageHeader
        title="Profile"
        description="How you show up on recipes you share."
        info={
          <>
            Your display name and photo appear as the author on any recipe you
            share. <strong>Share new recipes automatically</strong> only
            affects recipes added after you turn it on — it never publishes
            anything you&apos;ve already written. Individual recipes can always be
            shared or made private from their own page.
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

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Daily calorie goal</span>
            <input
              name="daily_calorie_goal"
              type="number"
              inputMode="numeric"
              min={500}
              max={10000}
              step={50}
              placeholder="e.g. 2200"
              defaultValue={goalRow?.daily_calorie_goal ?? ""}
              disabled={!goalAvailable}
              className={`${inputClass} w-40 disabled:opacity-50`}
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {goalAvailable ? (
                <>
                  This Week compares your prepped meals against it, multiplied
                  out across the seven days. Leave it empty if you&apos;d
                  rather not see one.
                </>
              ) : (
                <>
                  Unavailable — the database hasn&apos;t got this column yet.
                  Run the calorie-goal migration and it&apos;ll turn on.
                </>
              )}
            </span>
          </label>

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              name="share_new_recipes"
              defaultChecked={profile?.share_new_recipes ?? false}
              className="mt-0.5 h-4 w-4 accent-amber-600"
            />
            <span className="text-sm">
              Share new recipes automatically
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                When on, recipes you add are shared as soon as they&apos;re
                created. When off, each one stays private until you share it
                from its page. Either way, this never changes recipes you&apos;ve
                already added.
              </span>
            </span>
          </label>

          <div>
            <SubmitButton
              pendingLabel="Saving…"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-300"
            >
              Save profile
            </SubmitButton>
          </div>
        </form>

        <div className="border-t border-black/10 pt-4 dark:border-white/10">
          <h3 className="text-sm font-medium">Nutrition across your recipe box</h3>
          <p className="mb-3 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Works through your recipes one at a time, computing macros from
            ingredient weights and the USDA database. It&apos;s here rather
            than on a recipe page because it makes a lot of billable calls and
            shouldn&apos;t be a mis-tap away.
          </p>
          <MacroBackfill />
        </div>

        <div className="border-t border-black/10 pt-4 dark:border-white/10">
          <h3 className="text-sm font-medium">Getting around</h3>
          <p className="mb-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            A quick pass over meal planning, the shopping list, pantry staples
            and macros — the parts that don&apos;t work like other recipe apps.
          </p>
          <TourButton />
        </div>

        <div className="border-t border-black/10 pt-4 dark:border-white/10">
          <h3 className="text-sm font-medium">Appearance</h3>
          <p className="mb-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Applies straight away and is remembered on this device.
            &ldquo;System&rdquo; follows your computer&apos;s setting.
          </p>
          <ThemePicker initial={themeChoice} />
        </div>

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
