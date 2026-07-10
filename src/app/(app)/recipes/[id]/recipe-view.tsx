"use client";

import { useMemo, useState } from "react";
import { formatQuantity } from "@/lib/quantity";
import type { RecipeWithIngredients } from "@/lib/types";

const MULTIPLIERS = [0.5, 1, 1.5, 2, 3];

export function RecipeView({ recipe }: { recipe: RecipeWithIngredients }) {
  const [multiplier, setMultiplier] = useState(1);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

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
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* Ingredients column */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          <div className="flex items-center rounded-lg border border-black/10 p-0.5 dark:border-white/10">
            {MULTIPLIERS.map((m) => (
              <button
                key={m}
                onClick={() => setMultiplier(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  multiplier === m
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
                }`}
              >
                {m}×
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {formatQuantity(scaledServings)}{" "}
          {scaledServings === 1 ? "serving" : "servings"}
        </p>

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
                      {ing.quantity != null ? (
                        <strong className="font-semibold">
                          {formatQuantity(ing.quantity * multiplier)}
                          {ing.unit ? ` ${ing.unit}` : ""}
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
      <section>
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
                        ? "bg-emerald-600 text-white"
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
