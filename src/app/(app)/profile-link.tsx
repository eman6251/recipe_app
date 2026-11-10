import Link from "next/link";
import Image from "next/image";
import { UserRound } from "lucide-react";

/**
 * Way into the profile from the home page.
 *
 * The phone tab bar has four slots and the profile doesn't earn one — it's
 * somewhere you visit occasionally, not somewhere you work. But it had no
 * entry point on a phone at all, which made the settings, the theme, the
 * walkthrough and now Friends unreachable without knowing the URL. Beside
 * the greeting is where you'd look for it.
 */
export function ProfileLink({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string | null;
}) {
  return (
    <Link
      href="/profile"
      className="inline-flex items-center gap-2 rounded-full border border-black/10 py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:border-amber-400/60 hover:bg-amber-400/5 dark:border-white/15"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={28}
          height={28}
          sizes="28px"
          className="h-7 w-7 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
          <UserRound className="h-3.5 w-3.5" />
        </span>
      )}
      {/* The name on a laptop, where there's room for it; just "Profile" on a
          phone, where the greeting beside it is already taking the width. */}
      <span className="hidden sm:inline">{name || "Profile"}</span>
      <span className="sm:hidden">Profile</span>
    </Link>
  );
}
