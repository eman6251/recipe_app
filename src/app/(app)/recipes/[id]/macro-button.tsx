"use client";

import { useState, useTransition } from "react";
import { Flame } from "lucide-react";
import { computeMacros, type MacroComputeResult } from "./macro-actions";

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

  return (
    <div className="mt-4">
      <button
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

      {result && !result.ok ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {result.error}
        </p>
      ) : null}
      {result && result.ok ? (
        <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Matched {result.matched} of {result.total} ingredients via USDA.
          {result.skipped.length > 0 ? (
            <ul className="mt-1 list-inside list-disc text-emerald-700/80 dark:text-emerald-400/80">
              {result.skipped.map((s) => (
                <li key={s.item}>
                  {s.item} — {s.reason}
                </li>
              ))}
            </ul>
          ) : null}
          <details className="mt-2">
            <summary className="cursor-pointer text-emerald-700 dark:text-emerald-400">
              Per-ingredient breakdown
            </summary>
            <table className="mt-2 w-full text-xs">
              <tbody>
                {result.lines.map((line, i) => (
                  <tr
                    key={i}
                    className="border-t border-emerald-600/15 text-emerald-800/90 dark:text-emerald-300/90"
                  >
                    <td className="py-1 pr-2 font-medium">{line.item}</td>
                    <td className="py-1 pr-2 whitespace-nowrap">
                      {line.grams != null ? `${Math.round(line.grams)}g` : "—"}
                    </td>
                    <td className="py-1 pr-2">{line.match ?? "no match"}</td>
                    <td className="py-1 text-right whitespace-nowrap">
                      {line.kcal != null ? `${Math.round(line.kcal)} kcal` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      ) : null}
    </div>
  );
}
