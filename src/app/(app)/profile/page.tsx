import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";
import { AvatarUpload } from "./avatar-upload";

const inputClass =
  "rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, share_new_recipes")
    .eq("id", user?.id ?? "")
    .maybeSingle();

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

        <form action={updateProfile} className="flex flex-col gap-5">
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
              Shown as the author on recipes you share.
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
            <button
              type="submit"
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
            >
              Save profile
            </button>
          </div>
        </form>

        <p className="border-t border-black/10 pt-4 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          Signed in as {user?.email}
        </p>
      </section>
    </>
  );
}
