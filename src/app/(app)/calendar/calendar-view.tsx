"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import {
  calendarGrid,
  dayLabel,
  fromISODate,
  isSameDay,
  monthLabel,
  toISODate,
  WEEKDAY_LABELS,
} from "@/lib/dates";
import { macrosForServings, sumMacros, ZERO_MACROS } from "@/lib/macros";
import type { Macros } from "@/lib/types";
import { MealDialog, SLOT_ORDER, SLOT_STYLES } from "@/components/meal-dialog";
import { deletePlannedMeal } from "./actions";
import type {
  PlannedMealWithRecipe,
  RecipeOption,
} from "@/lib/queries/planner";

const HOVER_DELAY_MS = 500;

/** Day detail shown on hover: full meal names, slots, and the day's macros. */
function DayPopover({
  day,
  dayMeals,
  style,
  onMouseEnter,
  onMouseLeave,
}: {
  day: Date;
  dayMeals: PlannedMealWithRecipe[];
  style: React.CSSProperties;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  let total: Macros = ZERO_MACROS;
  let missing = 0;
  for (const meal of dayMeals) {
    const m = macrosForServings(meal.recipes.macros_per_serving, meal.servings);
    if (m) total = sumMacros(total, m);
    else missing++;
  }

  return (
    <div
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-50 w-64 rounded-xl border border-black/10 bg-surface p-3 shadow-xl dark:border-white/15"
    >
      <p className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {dayLabel(day)}
      </p>

      <ul className="flex flex-col gap-1.5">
        {dayMeals.map((meal) => (
          <li key={meal.id}>
            <Link
              href={`/recipes/${meal.recipe_id}`}
              className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <span
                className={`mb-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${SLOT_STYLES[meal.meal_slot]}`}
              >
                {meal.meal_slot}
              </span>
              <span
                className={`block text-sm leading-snug ${
                  meal.cooked
                    ? "text-zinc-400 line-through dark:text-zinc-500"
                    : ""
                }`}
              >
                {meal.recipes.title}
                {meal.servings !== 1 ? (
                  <span className="text-zinc-400"> ×{meal.servings}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-2 border-t border-black/10 pt-2 dark:border-white/10">
        <p className="text-xs">
          <span className="font-semibold">{Math.round(total.kcal)} kcal</span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {" · "}
            {Math.round(total.protein_g)}p {Math.round(total.carbs_g)}c{" "}
            {Math.round(total.fat_g)}f
          </span>
        </p>
        {missing > 0 ? (
          <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
            {missing} {missing === 1 ? "meal has" : "meals have"} no macro data
          </p>
        ) : null}
      </div>
    </div>
  );
}

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
  const [hover, setHover] = useState<{
    iso: string;
    style: React.CSSProperties;
  } | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // A fixed-position popover would drift away from its cell on scroll.
    const close = () => setHover(null);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("scroll", close, true);
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const POPOVER_W = 256;
  const POPOVER_MAX_H = 320;

  const openAfterDelay = (iso: string, cell: HTMLElement) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      const r = cell.getBoundingClientRect();
      // Flip above / shift inward so the popover always lands on-screen.
      const openUp = r.bottom + POPOVER_MAX_H > window.innerHeight;
      const left = Math.max(
        8,
        Math.min(r.left, window.innerWidth - POPOVER_W - 8),
      );
      setHover({
        iso,
        style: openUp
          ? { left, bottom: window.innerHeight - r.top + 4 }
          : { left, top: r.bottom + 4 },
      });
    }, HOVER_DELAY_MS);
  };

  /** Small grace period so the cursor can travel into the popover. */
  const scheduleClose = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHover(null), 150);
  };

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

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
                    onMouseEnter={(e) => {
                      if (dayMeals.length > 0)
                        openAfterDelay(iso, e.currentTarget);
                    }}
                    onMouseLeave={scheduleClose}
                    className={`group relative min-h-24 border-r border-black/5 p-1.5 last:border-r-0 dark:border-white/5 ${
                      inMonth ? "" : "opacity-40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          isToday
                            ? "bg-amber-400 font-semibold text-zinc-950"
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

      {/* Portalled so the grid's horizontal scroll container can't clip it. */}
      {hover && typeof document !== "undefined"
        ? createPortal(
            <DayPopover
              day={fromISODate(hover.iso)}
              dayMeals={byDate.get(hover.iso) ?? []}
              style={hover.style}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            />,
            document.body,
          )
        : null}

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
