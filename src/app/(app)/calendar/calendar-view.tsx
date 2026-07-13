"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import {
  calendarGrid,
  isSameDay,
  monthLabel,
  toISODate,
  WEEKDAY_LABELS,
} from "@/lib/dates";
import { MealDialog, SLOT_ORDER, SLOT_STYLES } from "@/components/meal-dialog";
import { deletePlannedMeal } from "./actions";
import type {
  PlannedMealWithRecipe,
  RecipeOption,
} from "@/lib/queries/planner";

export function CalendarView({
  year,
  monthIdx,
  meals,
  recipes,
}: {
  year: number;
  monthIdx: number;
  meals: PlannedMealWithRecipe[];
  recipes: RecipeOption[];
}) {
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const weeks = calendarGrid(year, monthIdx);
  const today = new Date();

  const byDate = new Map<string, PlannedMealWithRecipe[]>();
  for (const meal of meals) {
    const list = byDate.get(meal.planned_on) ?? [];
    list.push(meal);
    byDate.set(meal.planned_on, list);
  }
  for (const list of byDate.values()) {
    list.sort((a, b) => SLOT_ORDER[a.meal_slot] - SLOT_ORDER[b.meal_slot]);
  }

  const prev = new Date(year, monthIdx - 1, 1);
  const next = new Date(year, monthIdx + 1, 1);
  const monthParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{monthLabel(year, monthIdx)}</h2>
        <div className="flex items-center gap-1">
          <Link
            href={`/calendar?month=${monthParam(prev)}`}
            aria-label="Previous month"
            className="rounded-lg p-2 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/calendar"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
          >
            Today
          </Link>
          <Link
            href={`/calendar?month=${monthParam(next)}`}
            aria-label="Next month"
            className="rounded-lg p-2 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-surface dark:border-white/10">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-black/10 dark:border-white/10">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                {d}
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div
              key={wi}
              className="grid grid-cols-7 border-b border-black/10 last:border-b-0 dark:border-white/10"
            >
              {week.map((day) => {
                const iso = toISODate(day);
                const inMonth = day.getMonth() === monthIdx;
                const isToday = isSameDay(day, today);
                const dayMeals = byDate.get(iso) ?? [];

                return (
                  <div
                    key={iso}
                    className={`group min-h-24 border-r border-black/5 p-1.5 last:border-r-0 dark:border-white/5 ${
                      inMonth ? "" : "opacity-40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          isToday
                            ? "bg-emerald-600 font-semibold text-white"
                            : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      <button
                        onClick={() => setDialogDate(iso)}
                        aria-label={`Add meal on ${iso}`}
                        className="rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100 dark:hover:bg-white/10"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <ul className="mt-1 flex flex-col gap-1">
                      {dayMeals.map((meal) => (
                        <li
                          key={meal.id}
                          className={`group/meal flex items-center gap-1 rounded px-1.5 py-0.5 text-xs leading-tight ${SLOT_STYLES[meal.meal_slot]} ${meal.cooked ? "opacity-50" : ""}`}
                        >
                          <span className="truncate">{meal.recipes.title}</span>
                          <button
                            onClick={() =>
                              startTransition(() => deletePlannedMeal(meal.id))
                            }
                            aria-label="Remove"
                            className="ml-auto shrink-0 opacity-0 transition-opacity group-hover/meal:opacity-70 hover:!opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {dialogDate ? (
        <MealDialog
          date={dialogDate}
          recipes={recipes}
          onClose={() => setDialogDate(null)}
        />
      ) : null}
    </>
  );
}
