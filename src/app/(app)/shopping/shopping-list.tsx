"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw, ShoppingCart } from "lucide-react";
import type { PortionChoice, ShoppingLine } from "@/lib/shopping";
import { PortionChoices } from "./portion-choices";
import { useToast } from "@/components/toast";
import { resetChecks, setItemChecked } from "./check-actions";

/**
 * Ticks, held locally and written through to the account.
 *
 * They used to live in localStorage, which is per-browser: the laptop you
 * planned on and the phone in your hand disagreed about what was already in
 * the basket. Seeded from the server now, so a phone opens showing what the
 * laptop crossed off.
 *
 * The local set still leads and the write follows behind it. A checkbox that
 * waits on a round trip feels broken in a supermarket on one bar of signal,
 * and the tick is cheap to put back: a failed write reverts it rather than
 * leaving the screen and the account quietly disagreeing.
 *
 * Seeded once, at mount. A tick made on another device mid-shop shows up on
 * the next load rather than arriving live, which suits a list two people
 * rarely hold at the same moment.
 */
function useCheckedItems(initial: string[], onError: (message: string) => void) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initial));

  const apply = (key: string, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const toggle = (key: string) => {
    const on = !checked.has(key);
    apply(key, on);
    setItemChecked(key, on).then((result) => {
      if (result?.error) {
        apply(key, !on);
        onError(
          `Couldn't save "${key}" as ${on ? "checked" : "unchecked"} — it won't carry to your other devices.`,
        );
      }
    });
  };

  const reset = () => {
    const previous = checked;
    setChecked(new Set());
    resetChecks().then((result) => {
      if (result?.error) {
        setChecked(previous);
        onError("Couldn't clear your checked items. They're back as they were.");
      }
    });
  };

  return { checked, toggle, reset };
}

export function ShoppingList({
  initialChecked,
  toBuy,
  covered,
  skipped,
  choices,
}: {
  /** Item keys already ticked, read from the account on the server. */
  initialChecked: string[];
  toBuy: ShoppingLine[];
  covered: ShoppingLine[];
  /** Counts of what was left off, and why. */
  skipped: { cooked: number; past: number };
  /** Batches planned for less than one full recipe. */
  choices: PortionChoice[];
}) {
  const toast = useToast();
  const { checked, toggle, reset } = useCheckedItems(initialChecked, toast);

  const skippedParts = [
    skipped.cooked > 0 ? `${skipped.cooked} already cooked` : null,
    skipped.past > 0 ? `${skipped.past} past their cook day` : null,
  ].filter(Boolean);
  const skippedNote =
    skippedParts.length > 0 ? `Left off: ${skippedParts.join(", ")}` : null;
  const remaining = toBuy.filter((l) => !checked.has(l.key)).length;

  // Ticked items sink to the bottom, so what's left to find is always at the
  // top of the list instead of scattered through it. Stable within each half,
  // which keeps the alphabetical order the server sent.
  const ordered = useMemo(() => {
    const todo = toBuy.filter((l) => !checked.has(l.key));
    const done = toBuy.filter((l) => checked.has(l.key));
    return [...todo, ...done];
  }, [toBuy, checked]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Still to cook</h2>
        {/* One quiet line, so a recipe you planned and can't find here has a
            visible reason rather than looking lost. */}
        {skippedNote ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {skippedNote}
          </p>
        ) : null}
      </div>

      <PortionChoices choices={choices} />

      {toBuy.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-surface/60 p-10 text-center dark:border-white/15">
          <p className="font-medium">Nothing to buy</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {skipped.cooked > 0 || skipped.past > 0 || covered.length > 0 ? (
              "Everything still ahead of you is either cooked already or covered by your pantry staples."
            ) : (
              <>
                <Link
                  href="/calendar"
                  className="text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
                >
                  Plan some meals
                </Link>{" "}
                and your shopping list will build itself.
              </>
            )}
          </p>
        </div>
      ) : (
        <section className="rounded-xl border border-black/10 bg-surface p-5 dark:border-white/10">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold">
                {remaining} of {toBuy.length} to get
              </h3>
            </div>
            {checked.size > 0 ? (
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            ) : null}
          </div>

          <ul className="flex flex-col gap-1">
            {ordered.map((line) => {
              const isChecked = checked.has(line.key);
              return (
                <li key={line.key}>
                  <button
                    onClick={() => toggle(line.key)}
                    className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isChecked
                          ? "border-amber-400 bg-amber-400"
                          : "border-black/20 dark:border-white/20"
                      }`}
                    >
                      {isChecked ? (
                        <svg
                          viewBox="0 0 16 16"
                          className="h-3 w-3 text-white"
                          fill="currentColor"
                        >
                          <path d="M6.5 11.5 3 8l1.4-1.4 2.1 2.1L11.6 3.6 13 5z" />
                        </svg>
                      ) : null}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={`flex flex-wrap items-baseline gap-x-2 capitalize ${
                          isChecked
                            ? "text-zinc-400 line-through dark:text-zinc-600"
                            : ""
                        }`}
                      >
                        <span className="font-medium">{line.item}</span>
                        {line.quantityDisplay ? (
                          <span className="text-sm text-zinc-500 dark:text-zinc-400 normal-case">
                            {line.quantityDisplay}
                          </span>
                        ) : null}
                        {line.restock ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                            restock
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-zinc-400 dark:text-zinc-500">
                        {line.recipeTitles.join(", ")}
                        {line.totalGrams != null
                          ? ` · ~${Math.round(line.totalGrams)}g`
                          : ""}
                        {line.mergedFrom
                          ? ` · combines ${line.mergedFrom.join(" + ")}`
                          : ""}
                      </span>
                      {line.restockNote ? (
                        <span className="mt-0.5 block text-xs text-amber-600 dark:text-amber-400">
                          {line.restockNote}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {covered.length > 0 ? (
        <details className="mt-4 rounded-xl border border-black/10 bg-surface p-5 dark:border-white/10">
          <summary className="cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Already in your pantry ({covered.length})
          </summary>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {covered.map((line) => (
              <li
                key={line.key}
                className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs capitalize text-zinc-500 dark:bg-white/5 dark:text-zinc-400"
              >
                {line.item}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
