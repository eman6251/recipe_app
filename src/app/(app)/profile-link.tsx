import { ProfileMenu } from "@/components/profile-menu";
import type { ThemeChoice } from "@/lib/theme";

/**
 * The account control beside the greeting on the home page.
 *
 * It opens the same menu the desktop top bar does, rather than navigating
 * straight to the profile — the theme switch lives in there, and a phone has
 * no top bar to reach it from otherwise.
 *
 * The name sits beside the avatar where there's room and drops away on a
 * phone, where the greeting it sits next to is already taking the width.
 */
export function ProfileLink({
  avatarUrl,
  name,
  theme,
}: {
  avatarUrl: string | null;
  name: string | null;
  theme: ThemeChoice;
}) {
  return (
    <span className="flex items-center gap-2">
      {name ? (
        <span className="hidden text-sm font-medium text-zinc-600 sm:inline dark:text-zinc-300">
          {name}
        </span>
      ) : null}
      <ProfileMenu avatarUrl={avatarUrl} theme={theme} />
    </span>
  );
}
