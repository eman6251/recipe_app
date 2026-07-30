"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShoppingCart,
} from "lucide-react";
import { addDays, fromISODate, toISODate } from "@/lib/dates";
import type { ShoppingLine } from "@/lib/shopping";

function weekRangeLabel(weekStart: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(weekStart)} – ${fmt(addDays(weekStart, 6))}`;
}

/** Persist checked items per-week in localStorage — no server round trip needed. */
function useCheckedItems(storageKey: string) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setChecked(raw ? new Set(JSON.parse(raw)) : new Set());
    } catch {
      setChecked(new Set());
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return; // don't overwrite storage with the initial empty state
    window.localStorage.setItem(storageKey, JSON.stringify([...checked]));
  }, [checked, loaded, storageKey]);

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return { checked, toggle, reset: () => setChecked(new Set()) };
}

export function ShoppingList({
  weekStart,
  mealCount,
  toBuy,
  covered,
}: {
  weekStart: string; // YYYY-MM-DD
  mealCount: number;
  toBuy: ShoppingLine[];
  covered: ShoppingLine[];
}) {
  const start = fromISODate(weekStart);
  const prevWeekStart = toISODate(addDays(start, -7));
  const nextWeekStart = toISODate(addDays(start, 7));

  const { checked, toggle, reset } = useCheckedItems(`shopping-checked:${weekStart}`);
  const remaining = toBuy.filter((l) => !checked.has(l.key)).length;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{weekRangeLabel(start)}</h2>
        <div className="flex items-center gap-1">
          <Link
            href={`/shopping?start=${prevWeekStart}`}
            aria-label="Previous week"
            className="rounded-lg p-2 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/shopping"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
          >
            This week
          </Link>
          <Link
            href={`/shopping?start=${nextWeekStart}`}
            aria-label="Next week"
            className="rounded-lg p-2 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {mealCount === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-surface/60 p-10 text-center dark:border-white/15">
          <p className="font-medium">Nothing planned this week</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            <Link
              href={`/week?start=${weekStart}`}
              className="text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              Plan some meals
            </Link>{" "}
            and your shopping list will build itself.
          </p>
        </div>
      ) : toBuy.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-surface/60 p-10 text-center dark:border-white/15">
          <p className="font-medium">Nothing to buy</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Everything this week is covered by your pantry staples.
          </p>
        </div>
      ) : (
        <section className="rounded-xl border border-black/10 bg-surface p-5 dark:border-white/10">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
            {toBuy.map((line) => {
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
                          ? "border-emerald-600 bg-emerald-600"
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
                        {line.restock && line.remainingGrams != null
                          ? ` · only ${Math.max(0, Math.round(line.remainingGrams))}g would be left`
                          : ""}
                        {line.mergedFrom
                          ? ` · combines ${line.mergedFrom.join(" + ")}`
                          : ""}
                      </span>
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
