"use client";

import { useMemo, useState } from "react";
import { formatQuantity } from "@/lib/quantity";
import type { RecipeWithIngredients } from "@/lib/types";

const MULTIPLIERS = [0.5, 1, 1.5, 2, 3];

const UNIT_MODES = [
  { id: "original", label: "Original" },
  { id: "grams", label: "Grams" },
  { id: "ounces", label: "Ounces" },
] as const;

type UnitMode = (typeof UNIT_MODES)[number]["id"];

const GRAMS_PER_OUNCE = 28.3495;

/**
 * Amount for one ingredient line at the current scale and unit mode.
 *
 * Weight modes lean on the per-ingredient gram estimates the importer and
 * macro pass already produce, so there's no volume→weight conversion (and no
 * per-food density table) to get wrong. Lines with no gram estimate fall back
 * to their original measurement rather than showing nothing.
 */
function formatAmount(
  ing: RecipeWithIngredients["recipe_ingredients"][number],
  multiplier: number,
  mode: UnitMode,
): string {
  if (mode !== "original" && ing.grams != null) {
    const grams = ing.grams * multiplier;
    if (mode === "grams") return `${Math.round(grams)} g`;
    const oz = grams / GRAMS_PER_OUNCE;
    return `${oz < 10 ? oz.toFixed(1) : Math.round(oz)} oz`;
  }

  if (ing.quantity == null) return "";
  return `${formatQuantity(ing.quantity * multiplier)}${ing.unit ? ` ${ing.unit}` : ""}`;
}

export function RecipeView({
  recipe,
  plannedPortions,
}: {
  recipe: RecipeWithIngredients;
  /** Portions planned for this recipe in a week, arrived at from the planner. */
  plannedPortions?: number;
}) {
  // Cooking for a planned week means cooking a scaled batch, so open at that
  // scale rather than the recipe's own yield.
  const plannedMultiplier =
    plannedPortions && plannedPortions > 0
      ? plannedPortions / (recipe.servings || 1)
      : null;

  const [multiplier, setMultiplier] = useState(plannedMultiplier ?? 1);
  const [unitMode, setUnitMode] = useState<UnitMode>("original");
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const anyGrams = recipe.recipe_ingredients.some((i) => i.grams != null);

  const multiplierOptions =
    plannedMultiplier && !MULTIPLIERS.includes(plannedMultiplier)
      ? [...MULTIPLIERS, plannedMultiplier].sort((a, b) => a - b)
      : MULTIPLIERS;

  const scaled = multiplier !== 1;

  const scaledServings = recipe.servings * multiplier;

  // Preserve ingredient-group ordering while bucketing rows.
  const groups = useMemo(() => {
    const out: { name: string | null; items: typeof recipe.recipe_ingredients }[] =
      [];
    for (const ing of recipe.recipe_ingredients) {
      const last = out[out.length - 1];
      if (last && last.name === (ing.group_name ?? null)) {
        last.items.push(ing);
      } else {
        out.push({ name: ing.group_name ?? null, items: [ing] });
      }
    }
    return out;
  }, [recipe.recipe_ingredients]);

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* Ingredients column */}
      <section className="rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          <div className="flex items-center rounded-lg border border-black/10 p-0.5 dark:border-white/10">
            {multiplierOptions.map((m) => (
              <button
                key={m}
                onClick={() => setMultiplier(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  multiplier === m
                    ? "bg-amber-400 text-zinc-950"
                    : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
                }`}
              >
                {formatQuantity(m)}×
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {formatQuantity(scaledServings)}{" "}
          {scaledServings === 1 ? "serving" : "servings"}
        </p>

        {anyGrams ? (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Measure in
            </span>
            <div className="flex items-center rounded-lg border border-black/10 p-0.5 dark:border-white/10">
              {UNIT_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setUnitMode(m.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    unitMode === m.id
                      ? "bg-amber-400 text-zinc-950"
                      : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {scaled ? (
          <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            {plannedMultiplier === multiplier && plannedPortions ? (
              <>
                Scaled for the <strong>{formatQuantity(plannedPortions)}</strong>{" "}
                {plannedPortions === 1 ? "portion" : "portions"} you have
                planned — the recipe itself makes {formatQuantity(recipe.servings)}.
              </>
            ) : (
              <>
                Amounts are scaled to {formatQuantity(multiplier)}× the recipe.
              </>
            )}{" "}
            <button
              onClick={() => setMultiplier(1)}
              className="underline underline-offset-2"
            >
              Show recipe amounts
            </button>
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-5">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.name ? (
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {group.name}
                </h3>
              ) : null}
              <ul className="flex flex-col gap-2.5">
                {group.items.map((ing) => (
                  <li key={ing.id} className="flex gap-2 text-[15px] leading-snug">
                    <span>
                      {formatAmount(ing, multiplier, unitMode) ? (
                        <strong
                          className={`font-semibold ${
                            scaled ? "text-amber-600 dark:text-amber-400" : ""
                          }`}
                        >
                          {formatAmount(ing, multiplier, unitMode)}
                        </strong>
                      ) : null}{" "}
                      {ing.item}
                      {ing.note ? (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          , {ing.note}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Instructions column */}
      <section className="rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10">
        <h2 className="text-lg font-semibold">Preparation</h2>
        <ol className="mt-4 flex flex-col gap-5">
          {recipe.instructions.map((step, i) => {
            const done = checkedSteps.has(i);
            return (
              <li key={i}>
                <button
                  onClick={() => toggleStep(i)}
                  className="group flex w-full gap-3 text-left"
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      done
                        ? "bg-amber-400 text-zinc-950"
                        : "bg-black/5 text-zinc-600 group-hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-[15px] leading-relaxed transition-colors ${
                      done
                        ? "text-zinc-400 line-through dark:text-zinc-600"
                        : ""
                    }`}
                  >
                    {step}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {recipe.notes ? (
          <div className="mt-8 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/40">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              Notes
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-amber-900/80 dark:text-amber-200/80">
              {recipe.notes}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
