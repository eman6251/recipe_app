"use client";

import { calendarGrid, isSameDay, toISODate, WEEKDAY_LABELS } from "@/lib/dates";
import type { PlannedMealWithRecipe } from "@/lib/queries/planner";
import type { MealSlot } from "@/lib/types";

/**
 * The month at phone width.
 *
 * Seven columns don't fit a 390px screen with recipe names in them, so the
 * desktop grid was scrolling in both directions at once and showing four days
 * at a time — which is neither an overview nor a usable day view.
 *
 * This keeps the overview and gives up the detail: each day is a number and a
 * dot per meal, coloured by slot. You can see at a glance which days are
 * planned and which are empty, which is the only thing a month grid is
 * actually good for. Tapping a day opens it properly.
 *
 * The detail lives in the sheet, and the week in full lives on This Week.
 */

/** Dot colour per slot, matching the badges used everywhere else. */
const SLOT_DOTS: Record<MealSlot, string> = {
  breakfast: "bg-orange-400",
  lunch: "bg-sky-400",
  dinner: "bg-teal-400",
  dessert: "bg-rose-400",
  snack: "bg-violet-400",
};

/** Beyond this the dots stop meaning anything and become a count. */
const MAX_DOTS = 4;

export function MonthCompact({
  year,
  monthIdx,
  mealsByDate,
  planningFrom,
  onPickDay,
}: {
  year: number;
  monthIdx: number;
  mealsByDate: Map<string, PlannedMealWithRecipe[]>;
  /**
   * When planning a recipe onto a day: the earliest day worth offering.
   * Those days get marked, since there's no hovering a phone to find out
   * which ones will take it.
   */
  planningFrom?: string;
  onPickDay: (iso: string) => void;
}) {
  const weeks = calendarGrid(year, monthIdx);
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-surface md:hidden dark:border-white/10">
      <div className="grid grid-cols-7 border-b border-black/10 dark:border-white/10">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            {d.slice(0, 1)}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div
          key={wi}
          className="grid grid-cols-7 border-b border-black/5 last:border-b-0 dark:border-white/5"
        >
          {week.map((day) => {
            const iso = toISODate(day);
            const dayMeals = mealsByDate.get(iso) ?? [];
            const inMonth = day.getMonth() === monthIdx;
            const isToday = isSameDay(day, today);
            const plannable = planningFrom != null && iso >= planningFrom;

            return (
              <button
                key={iso}
                onClick={() => onPickDay(iso)}
                aria-label={`${iso}, ${dayMeals.length} ${
                  dayMeals.length === 1 ? "meal" : "meals"
                }`}
                className={`flex min-h-16 flex-col items-center gap-1 border-r border-black/5 py-2 last:border-r-0 dark:border-white/5 ${
                  inMonth ? "" : "opacity-35"
                } ${plannable ? "bg-amber-400/10" : ""}`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                    isToday
                      ? "bg-amber-400 font-semibold text-zinc-950"
                      : "text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {day.getDate()}
                </span>

                {/* A fixed-height strip whether or not there are dots, so the
                    rows don't jump about as a month fills up. */}
                <span className="flex h-3 items-center justify-center gap-[3px]">
                  {dayMeals.length > MAX_DOTS ? (
                    <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      {dayMeals.length}
                    </span>
                  ) : (
                    dayMeals.map((meal) => (
                      <span
                        key={meal.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          SLOT_DOTS[meal.meal_slot]
                        } ${meal.cooked ? "opacity-40" : ""}`}
                      />
                    ))
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
