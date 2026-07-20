"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Plus,
  ShoppingCart,
  X,
} from "lucide-react";
import { addDays, dayLabel, fromISODate, isSameDay, toISODate } from "@/lib/dates";
import { MealDialog, SLOT_ORDER, SLOT_STYLES } from "@/components/meal-dialog";
import { deletePlannedMeal, setMealCooked } from "../calendar/actions";
import type {
  PlannedMealWithRecipe,
  RecipeOption,
} from "@/lib/queries/planner";
import type { Macros } from "@/lib/types";

const ZERO: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

function mealMacros(meal: PlannedMealWithRecipe): Macros | null {
  const per = meal.recipes.macros_per_serving;
  if (!per) return null;
  return {
    kcal: per.kcal * meal.servings,
    protein_g: per.protein_g * meal.servings,
    carbs_g: per.carbs_g * meal.servings,
    fat_g: per.fat_g * meal.servings,
  };
}

function sum(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
  };
}

function MacroStrip({ m, label }: { m: Macros; label?: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
      {label ? <span className="font-medium">{label}</span> : null}
      <span className="font-semibold text-zinc-700 dark:text-zinc-200">
        {Math.round(m.kcal)} kcal
      </span>
      <span>{Math.round(m.protein_g)}g protein</span>
      <span>{Math.round(m.carbs_g)}g carbs</span>
      <span>{Math.round(m.fat_g)}g fat</span>
    </span>
  );
}

export function WeekView({
  monday,
  meals,
  recipes,
}: {
  monday: string; // YYYY-MM-DD of week start
  meals: PlannedMealWithRecipe[];
  recipes: RecipeOption[];
}) {
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const start = fromISODate(monday);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
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

  // Week totals
  let weekTotal = ZERO;
  let daysWithMeals = 0;
  let missingMacros = 0;
  for (const day of days) {
    const dayMeals = byDate.get(toISODate(day)) ?? [];
    if (dayMeals.length > 0) daysWithMeals++;
    for (const meal of dayMeals) {
      const m = mealMacros(meal);
      if (m) weekTotal = sum(weekTotal, m);
      else missingMacros++;
    }
  }
  const avg =
    daysWithMeals > 0
      ? {
          kcal: weekTotal.kcal / daysWithMeals,
          protein_g: weekTotal.protein_g / daysWithMeals,
          carbs_g: weekTotal.carbs_g / daysWithMeals,
          fat_g: weekTotal.fat_g / daysWithMeals,
        }
      : ZERO;

  const prevMonday = toISODate(addDays(start, -7));
  const nextMonday = toISODate(addDays(start, 7));
  const weekRangeLabel = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(start, 6).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{weekRangeLabel}</h2>
        <div className="flex items-center gap-1">
          <Link
            href={`/week?start=${prevMonday}`}
            aria-label="Previous week"
            className="rounded-lg p-2 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/week"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
          >
            This week
          </Link>
          <Link
            href={`/week?start=${nextMonday}`}
            aria-label="Next week"
            className="rounded-lg p-2 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/shopping?start=${monday}`}
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-black/5 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Shopping list
          </Link>
        </div>
      </div>

      {/* Week macro summary */}
      <section className="mb-6 rounded-xl border border-black/10 bg-surface p-5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold">Week macros</h3>
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <MacroStrip m={avg} label="Daily average:" />
          <MacroStrip m={weekTotal} label="Week total:" />
        </div>
        {missingMacros > 0 ? (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {missingMacros} planned {missingMacros === 1 ? "meal has" : "meals have"}{" "}
            no macro data — open the recipe and hit “Compute macros” to include{" "}
            {missingMacros === 1 ? "it" : "them"}.
          </p>
        ) : null}
      </section>

      {/* Days */}
      <div className="flex flex-col gap-4">
        {days.map((day) => {
          const iso = toISODate(day);
          const dayMeals = byDate.get(iso) ?? [];
          const isToday = isSameDay(day, today);

          let dayTotal: Macros | null = null;
          for (const meal of dayMeals) {
            const m = mealMacros(meal);
            if (m) dayTotal = dayTotal ? sum(dayTotal, m) : m;
          }

          return (
            <section
              key={iso}
              className={`rounded-xl border bg-surface p-4 dark:border-white/10 ${
                isToday
                  ? "border-emerald-500/50"
                  : "border-black/10"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">
                  {dayLabel(day)}
                  {isToday ? (
                    <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                      today
                    </span>
                  ) : null}
                </h3>
                <div className="flex items-center gap-3">
                  {dayTotal ? <MacroStrip m={dayTotal} /> : null}
                  <button
                    onClick={() => setDialogDate(iso)}
                    className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-black/5 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
              </div>

              {dayMeals.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {dayMeals.map((meal) => {
                    const m = mealMacros(meal);
                    return (
                      <li
                        key={meal.id}
                        className="flex items-center gap-3 rounded-lg border border-black/5 px-3 py-2 dark:border-white/5"
                      >
                        <button
                          onClick={() =>
                            startTransition(() =>
                              setMealCooked(meal.id, !meal.cooked),
                            )
                          }
                          aria-label={meal.cooked ? "Mark not cooked" : "Mark cooked"}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            meal.cooked
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-black/20 dark:border-white/20"
                          }`}
                        >
                          {meal.cooked ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>

                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${SLOT_STYLES[meal.meal_slot]}`}
                        >
                          {meal.meal_slot}
                        </span>

                        <Link
                          href={`/recipes/${meal.recipe_id}`}
                          className={`truncate text-sm hover:underline ${
                            meal.cooked ? "text-zinc-400 line-through dark:text-zinc-500" : ""
                          }`}
                        >
                          {meal.recipes.title}
                        </Link>
                        {meal.servings !== 1 ? (
                          <span className="text-xs text-zinc-400">
                            ×{meal.servings}
                          </span>
                        ) : null}

                        <span className="ml-auto hidden whitespace-nowrap text-xs text-zinc-500 sm:block dark:text-zinc-400">
                          {m ? `${Math.round(m.kcal)} kcal` : "no macros"}
                        </span>

                        <button
                          onClick={() =>
                            startTransition(() => deletePlannedMeal(meal.id))
                          }
                          aria-label="Remove"
                          className="shrink-0 rounded p-1 text-zinc-400 hover:bg-black/5 hover:text-red-600 dark:hover:bg-white/10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
                  Nothing planned.
                </p>
              )}
            </section>
          );
        })}
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
