"use client";

import { useEffect, useState } from "react";
import { UsersRound, X } from "lucide-react";
import { FriendsHub } from "./friends-hub";

/**
 * Opens the friends slide-over. Lives in the desktop top bar only: the panel
 * is a comfortable width on a laptop and a cramped one on a phone, where a
 * chat needs the whole screen and the keyboard needs somewhere to go. The
 * phone tab bar routes to /friends instead, which renders the same content
 * full-page.
 */
export function FriendsButton({ meId }: { meId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Friends"
        className="rounded-lg p-2 text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <UsersRound className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 hidden md:block">
          <button
            aria-label="Close friends panel"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />
          <aside className="absolute inset-y-0 right-0 flex w-96 flex-col border-l border-amber-400/20 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
              <h2 className="text-sm font-semibold">Friends</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <FriendsHub meId={meId} active />
          </aside>
        </div>
      ) : null}
    </>
  );
}
