import Link from "next/link";
import { UsersRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { updatePreferences } from "../profile/actions";
import { MacroBackfill } from "../profile/macro-backfill";
import { TourButton } from "@/components/tour/tour-button";

const inputClass =
  "rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15";

/**
 * How the app behaves, as opposed to who you are.
 *
 * Split from the profile when the avatar menu grew two entries for it: one
 * page holding both your display name and a bulk macro recomputation was
 * really two pages that had never been separated.
 *
 * Appearance isn't here — the theme lives in that menu instead, because
 * switching it is something you do in passing rather than something you
 * navigate to.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: profile, error: profileError }, { data: goalRow, error: goalError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("share_new_recipes")
        .eq("id", user?.id ?? "")
        .maybeSingle(),
      // Asked for separately: its column arrived in a later migration, and
      // PostgREST fails an entire select over one it doesn't recognise.
      supabase
        .from("profiles")
        .select("daily_calorie_goal")
        .eq("id", user?.id ?? "")
        .maybeSingle(),
    ]);

  if (profileError) {
    throw new Error(`Couldn't load your settings: ${profileError.message}`);
  }
  const goalAvailable = !goalError;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Targets, defaults, and the tools that work across your whole recipe box."
      />

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          {message}
        </p>
      ) : null}

      <section className="flex max-w-xl flex-col gap-5 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10">
        <form action={updatePreferences} className="flex flex-col gap-5">
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
                  This Week compares your prepped meals against it across the
                  seven days, and your fibre target is derived from it at 14g
                  per 1,000 calories. Leave it empty if you&apos;d rather not
                  see one.
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
                from its page. Either way, this never changes recipes
                you&apos;ve already added.
              </span>
            </span>
          </label>

          <div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-300"
            >
              Save settings
            </button>
          </div>
        </form>

        <div className="border-t border-black/10 pt-4 md:hidden dark:border-white/10">
          <h3 className="text-sm font-medium">Friends</h3>
          <p className="mb-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Your friend code, requests, and your chats.
          </p>
          <Link
            href="/friends"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 px-3 py-2 text-sm font-medium transition-colors hover:border-amber-400/80 hover:bg-amber-400/10"
          >
            <UsersRound className="h-4 w-4" />
            Friends and chat
          </Link>
        </div>

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
      </section>
    </>
  );
}
