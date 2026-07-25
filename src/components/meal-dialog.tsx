"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { addPlannedMeal } from "@/app/(app)/calendar/actions";
import { addDays, dayLabel, fromISODate } from "@/lib/dates";
import type { MealSlot } from "@/lib/types";
import type { RecipeOption } from "@/lib/queries/planner";

const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

const inputClass =
  "rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15";

export function MealDialog({
  date,
  recipes,
  onClose,
}: {
  date: string; // YYYY-MM-DD
  recipes: RecipeOption[];
  onClose: () => void;
}) {
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [slot, setSlot] = useState<MealSlot>("dinner");
  const [portions, setPortions] = useState("1");
  const [spread, setSpread] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const portionCount = Number(portions) || 1;
  const days = Math.max(1, Math.round(portionCount));
  const willSpread = spread && days > 1;

  const short = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const start = fromISODate(date);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addPlannedMeal({
        recipe_id: recipeId,
        planned_on: date,
        meal_slot: slot,
        portions: portionCount,
        spread,
      });
      if (result.error) setError(result.error);
      else onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-black/10 bg-surface p-5 shadow-xl dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{dayLabel(fromISODate(date))}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {recipes.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No recipes yet — add some first.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                {error}
              </p>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Recipe</span>
              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                className={inputClass}
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Meal</span>
                <select
                  value={slot}
                  onChange={(e) => setSlot(e.target.value as MealSlot)}
                  className={`${inputClass} capitalize`}
                >
                  {SLOTS.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Portions</span>
                <input
                  value={portions}
                  onChange={(e) => setPortions(e.target.value)}
                  type="number"
                  min="0.5"
                  step="0.5"
                  className={inputClass}
                />
              </label>
            </div>

            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={spread}
                onChange={(e) => setSpread(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-emerald-600"
              />
              <span className="text-sm">
                Spread across days
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {willSpread
                    ? `Adds one portion a day, ${short(start)} → ${short(addDays(start, days - 1))}.`
                    : portionCount === 1
                      ? `Adds one portion on ${short(start)}.`
                      : `Off — adds all ${portionCount} portions to ${short(start)}.`}
                </span>
              </span>
            </label>

            <button
              onClick={submit}
              disabled={pending || !recipeId}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? "Adding…" : willSpread ? `Add ${days} days` : "Add to plan"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const SLOT_STYLES: Record<MealSlot, string> = {
  breakfast:
    "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  lunch: "bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  dinner:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  snack:
    "bg-violet-50 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
};

export const SLOT_ORDER: Record<MealSlot, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};
