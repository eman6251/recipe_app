"use client";

import { useOptimistic, useTransition } from "react";
import { Scale } from "lucide-react";
import { formatQuantity } from "@/lib/quantity";
import type { PortionChoice } from "@/lib/shopping";
import { setBatchScale } from "./actions";
import { useToast } from "@/components/toast";

/**
 * The "whole recipe, or just what I planned?" prompt.
 *
 * Only appears for batches where the two readings differ — you planned fewer
 * portions than the recipe makes — and says which one the list is currently
 * using, because the quantities above have already been built one way or the
 * other and a silent default would be worse than no default.
 */
export function PortionChoices({ choices }: { choices: PortionChoice[] }) {
  const [, startTransition] = useTransition();
  const toast = useToast();

  // The quantities above this panel are rebuilt on the server, so switching
  // whole-recipe to half meant watching the segmented control sit on the old
  // answer until the page came back. The control moves first now; the list
  // behind it catches up a moment later, which is the right order — the
  // button you pressed should never be the last thing to respond.
  const [optimisticChoices, choose] = useOptimistic(
    choices,
    (
      current,
      { recipeId, cookedOn, scaleToPortions }: {
        recipeId: string;
        cookedOn: string;
        scaleToPortions: boolean;
      },
    ) =>
      current.map((c) =>
        c.recipeId === recipeId && c.cookedOn === cookedOn
          ? { ...c, scaleToPortions }
          : c,
      ),
  );

  if (choices.length === 0) return null;

  return (
    <section className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Scale className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h3 className="text-sm font-semibold">
          {choices.length === 1
            ? "You planned less than one full batch"
            : `${choices.length} recipes planned for less than a full batch`}
        </h3>
      </div>

      <ul className="flex flex-col gap-2.5">
        {optimisticChoices.map((choice) => {
          const fraction = formatQuantity(
            choice.plannedPortions / choice.recipeServings,
          );
          return (
            <li
              key={`${choice.recipeId}-${choice.cookedOn}`}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="min-w-0 text-sm">
                <span className="font-medium">{choice.title}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {choice.plannedPortions}{" "}
                  {choice.plannedPortions === 1 ? "portion" : "portions"}{" "}
                  planned, recipe makes {choice.recipeServings}
                </span>
              </span>

              <span className="flex shrink-0 rounded-lg border border-black/10 p-0.5 dark:border-white/15">
                {[
                  { value: false, label: "Whole recipe" },
                  { value: true, label: `Just ${fraction}×` },
                ].map((option) => (
                  <button
                    key={option.label}
                    aria-pressed={choice.scaleToPortions === option.value}
                    onClick={() =>
                      startTransition(async () => {
                        choose({
                          recipeId: choice.recipeId,
                          cookedOn: choice.cookedOn,
                          scaleToPortions: option.value,
                        });
                        const result = await setBatchScale(
                          choice.recipeId,
                          choice.cookedOn,
                          choice.lastDay,
                          option.value,
                        );
                        if (result?.error) {
                          toast(
                            `Couldn't change how much of ${choice.title} to buy. The list is unchanged.`,
                          );
                        }
                      })
                    }
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      choice.scaleToPortions === option.value
                        ? "bg-amber-400 text-zinc-950"
                        : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
        The list holds the whole recipe unless you say otherwise — you can&apos;t
        cook a quarter of a stew. Switch it where the recipe really does divide.
      </p>
    </section>
  );
}
