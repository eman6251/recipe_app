"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Flame, Pencil } from "lucide-react";
import { computeMacros, type MacroComputeResult } from "./macro-actions";

/**
 * Share of the recipe's calories above which a single line is worth a second
 * look. Nutrition errors aren't spread evenly — they collect in whichever
 * ingredient is bulkiest, because that's the one whose weight was guessed at
 * and the one a wrong guess moves the total by. A line carrying most of the
 * calories is where to look first when the numbers come out wrong.
 */
const DOMINANT_SHARE = 0.4;

export function MacroButton({
  recipeId,
  hasMacros,
}: {
  recipeId: string;
  hasMacros: boolean;
}) {
  const [result, setResult] = useState<MacroComputeResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setResult(null);
    startTransition(async () => {
      setResult(await computeMacros(recipeId, hasMacros));
    });
  };

  const lines = result?.ok ? result.lines : [];
  const totalKcal = lines.reduce((sum, l) => sum + (l.kcal ?? 0), 0);
  const dominant =
    totalKcal > 0
      ? lines.find(
          (l) =>
            l.kcal != null && l.grams != null && l.kcal / totalKcal >= DOMINANT_SHARE,
        )
      : undefined;

  return (
    <div className="mt-4">
      <button
        data-tour="compute-macros"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
      >
        <Flame className="h-3.5 w-3.5" />
        {pending
          ? "Computing…"
          : hasMacros
            ? "Recompute macros"
            : "Compute macros"}
      </button>

      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        Still a work in progress — matches and gram estimates aren&apos;t
        always right, so check the breakdown before trusting the totals.
      </p>

      {result && !result.ok ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {result.error}
        </p>
      ) : null}
      {result && result.ok ? (
        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Matched {result.matched} of {result.total} ingredients via USDA.
          {result.skipped.length > 0 ? (
            <ul className="mt-1 list-inside list-disc text-amber-700/80 dark:text-amber-400/80">
              {result.skipped.map((s) => (
                <li key={s.item}>
                  {s.item} — {s.reason}
                </li>
              ))}
            </ul>
          ) : null}
          {dominant ? (
            <p className="mt-2 rounded-lg border border-amber-500/40 px-2.5 py-2 text-xs">
              <strong>{dominant.item}</strong> accounts for{" "}
              {Math.round((dominant.kcal! / totalKcal) * 100)}% of the
              calories, at {Math.round(dominant.grams!)}g. If the totals look
              wrong, this is the line to check — most of the error in a recipe
              lands on whichever ingredient is bulkiest.{" "}
              <Link
                href={`/recipes/${recipeId}/edit`}
                className="inline-flex items-center gap-1 underline underline-offset-2"
              >
                <Pencil className="h-3 w-3" />
                Fix its weight
              </Link>
            </p>
          ) : null}

          <details className="mt-2">
            <summary className="cursor-pointer text-amber-700 dark:text-amber-400">
              Per-ingredient breakdown
            </summary>
            <table className="mt-2 w-full text-xs">
              <tbody>
                {result.lines.map((line, i) => {
                  const share =
                    line.kcal != null && totalKcal > 0
                      ? line.kcal / totalKcal
                      : null;
                  return (
                    <tr
                      key={i}
                      className={`border-t border-amber-400/15 text-amber-800/90 dark:text-amber-300/90 ${
                        share != null && share >= DOMINANT_SHARE
                          ? "font-semibold"
                          : ""
                      }`}
                    >
                      <td className="py-1 pr-2 font-medium">{line.item}</td>
                      <td className="py-1 pr-2 whitespace-nowrap">
                        {line.grams != null ? `${Math.round(line.grams)}g` : "—"}
                      </td>
                      {/* Energy density is what exposes a cooked-vs-dry mix-up:
                          dry pasta is ~360 kcal/100g and cooked is ~150. */}
                      <td className="py-1 pr-2 whitespace-nowrap opacity-70">
                        {line.kcal != null && line.grams ? (
                          `${Math.round((line.kcal / line.grams) * 100)}/100g`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-1 pr-2">{line.match ?? "no match"}</td>
                      <td className="py-1 text-right whitespace-nowrap">
                        {line.kcal != null ? `${Math.round(line.kcal)} kcal` : "—"}
                      </td>
                      <td className="py-1 pl-2 text-right whitespace-nowrap opacity-70">
                        {share != null ? `${Math.round(share * 100)}%` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        </div>
      ) : null}
    </div>
  );
}
