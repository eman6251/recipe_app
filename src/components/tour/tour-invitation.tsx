"use client";

import { Compass, X } from "lucide-react";

/**
 * Shown once to people who were already using the app when the walkthrough
 * landed. A card rather than a modal: they know their way around well enough
 * that interrupting them would be rude.
 */
export function TourInvitation({
  onStart,
  onDismiss,
}: {
  onStart: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-x-4 bottom-24 z-[90] md:inset-x-auto md:bottom-6 md:right-6 md:w-80">
      <div className="rounded-2xl border border-amber-400/40 bg-surface p-4 shadow-2xl">
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400">
            <Compass className="h-4 w-4" />
          </span>
          <div className="min-w-0 pr-4">
            <h2 className="text-sm font-semibold">There&apos;s a walkthrough now</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Two minutes through meal planning, the shopping list, pantry
              staples and macros — the parts other recipe apps don&apos;t have.
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onDismiss}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
          >
            Not now
          </button>
          <button
            onClick={onStart}
            className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-medium text-zinc-950 transition-colors hover:bg-amber-300"
          >
            Show me
          </button>
        </div>
      </div>
    </div>
  );
}
