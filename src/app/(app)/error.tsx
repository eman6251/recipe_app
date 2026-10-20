"use client";

import { useEffect } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";

/**
 * Shown when a page throws — in practice, almost always because the database
 * couldn't be reached.
 *
 * Worth having a real screen for: without one, a failed load renders as an
 * empty recipe box, and "all my recipes disappeared" is a far more alarming
 * reading than "the server is having a moment". Nothing is ever lost here;
 * the data simply didn't arrive.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-black/10 bg-surface px-6 py-12 text-center dark:border-white/10">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400">
        <CircleAlert className="h-5 w-5" />
      </span>

      <div>
        <h1 className="text-lg font-semibold">This page didn&apos;t load</h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Usually the database being briefly unreachable. Nothing has been
          lost — your recipes, plans and lists are all still there.
        </p>
      </div>

      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>

      {error.digest ? (
        <p className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
          {error.digest}
        </p>
      ) : null}
    </div>
  );
}
