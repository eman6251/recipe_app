import Image from "next/image";
import { UserRound } from "lucide-react";
import type { FriendProfile } from "@/lib/friends";

export function Avatar({
  profile,
  size = 36,
}: {
  profile: Pick<FriendProfile, "avatar_url" | "display_name">;
  size?: number;
}) {
  const className =
    "shrink-0 overflow-hidden rounded-full bg-black/5 object-cover dark:bg-white/10";

  if (profile.avatar_url) {
    return (
      <Image
        src={profile.avatar_url}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={className}
        unoptimized
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className={`${className} flex items-center justify-center text-zinc-500 dark:text-zinc-400`}
    >
      <UserRound style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
}
