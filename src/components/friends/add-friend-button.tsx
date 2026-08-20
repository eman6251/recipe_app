"use client";

import { useState, useTransition } from "react";
import { Check, UserPlus } from "lucide-react";
import { requestFriendship } from "@/app/(app)/friends/actions";

/**
 * The other half of discovery: shared recipes carry an author, so the person
 * whose cooking you keep opening is someone you can ask to be friends with.
 *
 * Deliberately doesn't look up the existing friendship first — the request
 * function already reports "already friends" or "still waiting", so an extra
 * query per byline would buy nothing.
 */
export function AddFriendButton({
  userId,
  label = "Add friend",
}: {
  userId: string;
  label?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <span className="flex items-center gap-2">
      {message ? (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{message}</span>
      ) : null}
      <button
        disabled={pending || done}
        onClick={() =>
          startTransition(async () => {
            const result = await requestFriendship(userId);
            setMessage(result.message);
            setDone(result.ok);
          })
        }
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/40 px-2.5 py-1 text-xs font-medium transition-colors hover:border-amber-400/80 hover:bg-amber-400/10 disabled:opacity-60"
      >
        {done ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <UserPlus className="h-3.5 w-3.5" />
        )}
        {done ? "Sent" : label}
      </button>
    </span>
  );
}
