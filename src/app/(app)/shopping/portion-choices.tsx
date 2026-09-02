"use client";

import { useTransition } from "react";
import { Scale } from "lucide-react";
import { formatQuantity } from "@/lib/quantity";
import type { PortionChoice } from "@/lib/shopping";
import { setBatchScale } from "./actions";

/**
 * The "whole recipe, or just what I planned?" prompt.
 *
 * Only appears for batches where the two readings differ — you planned fewer
 * portions than the recipe makes — and says which one the list is currently
 * using, because the quantities above have already been built one way or the
 * other and a silent default would be worse than no default.
 */
export function PortionChoices({ choices }: { choices: PortionChoice[] }) {
  const [pending, startTransition] = useTransition();

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
        {choices.map((choice) => {
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
                    disabled={pending}
                    aria-pressed={choice.scaleToPortions === option.value}
                    onClick={() =>
                      startTransition(async () => {
                        await setBatchScale(
                          choice.recipeId,
                          choice.cookedOn,
                          choice.lastDay,
                          option.value,
                        );
                      })
                    }
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
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
