"use client";

import { useRef, useState } from "react";
import { Flame, LoaderCircle, Square } from "lucide-react";
import { computeMacros } from "@/app/(app)/recipes/[id]/macro-actions";
import {
  listRecipesForBackfill,
  type BackfillTarget,
} from "./backfill-actions";

/**
 * Compute macros across the whole recipe box.
 *
 * Lives on the profile page deliberately: it's many API calls, billed to the
 * app owner, and nothing about a button that spends money should be one
 * mis-tap away from a recipe page.
 *
 * Runs one recipe at a time from the browser rather than looping on the
 * server. A hundred recipes is far past any function timeout, and doing it
 * here means the run reports progress, survives a slow recipe, and can be
 * stopped. Sequential on purpose — firing them in parallel would collect
 * rate-limit errors from both USDA and Anthropic instead of results.
 */

type Failure = { title: string; reason: string };

export function MacroBackfill() {
  const [mode, setMode] = useState<"missing" | "all">("missing");
  const [reweigh, setReweigh] = useState(false);
  const [targets, setTargets] = useState<BackfillTarget[] | null>(null);
  const [done, setDone] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState<string | null>(null);
  const stopped = useRef(false);

  const prepare = async () => {
    setFinished(null);
    setFailures([]);
    setDone(0);
    try {
      setTargets(await listRecipesForBackfill(mode));
    } catch (err) {
      setFinished(err instanceof Error ? err.message : "Couldn't list recipes.");
    }
  };

  const run = async (list: BackfillTarget[]) => {
    setRunning(true);
    stopped.current = false;
    const failed: Failure[] = [];

    for (const [i, recipe] of list.entries()) {
      if (stopped.current) break;
      setCurrent(recipe.title);
      setDone(i);

      try {
        const result = await computeMacros(recipe.id, mode === "all", reweigh);
        if (!result.ok) {
          failed.push({ title: recipe.title, reason: result.error });
          setFailures([...failed]);
          // The daily AI cap stops the run rather than failing every
          // remaining recipe one at a time against a limit that won't move.
          if (/daily limit/i.test(result.error)) {
            setFinished(
              "Stopped — the daily AI limit was reached. The recipes done so far are saved.",
            );
            break;
          }
        }
      } catch (err) {
        failed.push({
          title: recipe.title,
          reason: err instanceof Error ? err.message : "Unknown error",
        });
        setFailures([...failed]);
      }
    }

    setDone(stopped.current ? done : list.length);
    setCurrent(null);
    setRunning(false);
    setTargets(null);
    setFinished((prev) =>
      prev ??
      (stopped.current
        ? "Stopped. Everything computed up to that point is saved."
        : `Finished. ${list.length - failed.length} of ${list.length} computed.`),
    );
  };

  const total = targets?.length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-lg border border-black/10 p-0.5 dark:border-white/10">
        {(
          [
            ["missing", "Only missing"],
            ["all", "All recipes"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={running}
            onClick={() => {
              setMode(value);
              setTargets(null);
              setFinished(null);
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              mode === value
                ? "bg-amber-400 text-zinc-950"
                : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={reweigh}
          disabled={running}
          onChange={(e) => setReweigh(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-amber-600"
        />
        <span className="text-sm">
          Also re-estimate ingredient weights
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            Recomputing normally keeps the gram weights read at import and only
            redoes the USDA matching. A wrong weight is the bigger error of the
            two — one over-estimated line can carry most of a recipe&apos;s
            calories — and the weights on older recipes predate the prompt that
            knows about package sizes and raw-versus-cooked. Slower, and it
            will move numbers you may have corrected by hand.
          </span>
        </span>
      </label>

      {running ? (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-400/40 bg-amber-400/5 p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
              <span className="truncate">{current ?? "Starting…"}</span>
            </span>
            <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
              {done} / {total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-amber-400 transition-[width]"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              stopped.current = true;
            }}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            <Square className="h-3 w-3" />
            Stop after this one
          </button>
        </div>
      ) : targets ? (
        // A second press before anything is spent, with the count in hand —
        // "all recipes" on a full box is a long, billable run.
        <div className="flex flex-col gap-2 rounded-lg border border-amber-400/40 bg-amber-400/5 p-3 text-sm">
          {total === 0 ? (
            <p>
              Nothing to do — every recipe
              {mode === "missing" ? " already has macros" : " would be skipped"}.
            </p>
          ) : (
            <>
              <p>
                This will compute macros for <strong>{total}</strong>{" "}
                {total === 1 ? "recipe" : "recipes"}, a few AI and USDA calls
                each, one at a time. Roughly a minute per ten, and it bills to
                the app&apos;s API key.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => run(targets)}
                  className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-medium text-zinc-950 transition-colors hover:bg-amber-300"
                >
                  Run it
                </button>
                <button
                  type="button"
                  onClick={() => setTargets(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={prepare}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-amber-400/40 px-3 py-2 text-sm font-medium transition-colors hover:border-amber-400/80 hover:bg-amber-400/10"
        >
          <Flame className="h-4 w-4" />
          {mode === "missing"
            ? "Compute missing macros"
            : "Recompute all macros"}
        </button>
      )}

      {finished ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{finished}</p>
      ) : null}

      {failures.length > 0 ? (
        <details className="text-xs">
          <summary className="cursor-pointer text-amber-600 dark:text-amber-400">
            {failures.length} didn&apos;t compute
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1 text-zinc-500 dark:text-zinc-400">
            {failures.map((f, i) => (
              <li key={`${f.title}-${i}`}>
                <span className="font-medium">{f.title}</span> — {f.reason}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
