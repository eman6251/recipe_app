"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { SLOT_STYLES } from "@/components/meal-dialog";
import { useToast } from "@/components/toast";
import { dayLabel, fromISODate } from "@/lib/dates";
import type { PlannedMealWithRecipe } from "@/lib/queries/planner";
import { deletePlannedMeal } from "./actions";

/**
 * One day, opened from the compact month grid.
 *
 * The desktop calendar shows a day's meals in its cell and reveals an add
 * button on hover — neither of which survives a touch screen, where there's
 * no room for the first and no hover for the second. Tapping a day brings
 * the same information up from the bottom instead, with Add always visible.
 *
 * A sheet rather than a page: you're usually filling in several days in a
 * row, and a round trip to a route and back for each one would make planning
 * a week feel like paperwork.
 */
export function DaySheet({
  iso,
  meals,
  onClose,
  onAdd,
}: {
  iso: string;
  meals: PlannedMealWithRecipe[];
  onClose: () => void;
  onAdd: () => void;
}) {
  const [, startTransition] = useTransition();
  const toast = useToast();

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-label={dayLabel(fromISODate(iso))}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-black/10 bg-surface px-4 pt-4 shadow-2xl dark:border-white/10"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            {dayLabel(fromISODate(iso))}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {meals.length === 0 ? (
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Nothing planned yet.
          </p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {meals.map((meal) => (
              <li
                key={meal.id}
                className="flex items-center gap-2.5 rounded-lg border border-black/10 p-2.5 dark:border-white/10"
              >
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${SLOT_STYLES[meal.meal_slot]}`}
                >
                  {meal.meal_slot}
                </span>
                <Link
                  href={`/recipes/${meal.recipe_id}`}
                  className={`min-w-0 flex-1 truncate text-sm ${
                    meal.cooked
                      ? "text-zinc-400 line-through dark:text-zinc-500"
                      : ""
                  }`}
                >
                  {meal.recipes.title}
                </Link>
                {meal.servings !== 1 ? (
                  <span className="shrink-0 text-xs text-zinc-400">
                    ×{meal.servings}
                  </span>
                ) : null}
                <button
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deletePlannedMeal(meal.id);
                      if (result?.error) {
                        toast(`Couldn't remove ${meal.recipes.title}.`);
                      }
                    })
                  }
                  aria-label={`Remove ${meal.recipes.title}`}
                  className="shrink-0 rounded p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-3 text-sm font-medium text-zinc-950"
        >
          <Plus className="h-4 w-4" />
          Add a meal
        </button>
      </div>
    </div>
  );
}
