import type { Macros } from "@/lib/types";

export const ZERO_MACROS: Macros = {
  kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  // Null, not zero: nothing has been added yet, so nothing is known.
  fiber_g: null,
};

/** Scale a recipe's per-serving macros to the number of servings planned. */
export function macrosForServings(
  perServing: Macros | null,
  servings: number,
): Macros | null {
  if (!perServing) return null;
  return {
    kcal: perServing.kcal * servings,
    protein_g: perServing.protein_g * servings,
    carbs_g: perServing.carbs_g * servings,
    fat_g: perServing.fat_g * servings,
    fiber_g:
      perServing.fiber_g != null ? perServing.fiber_g * servings : null,
  };
}

export function sumMacros(a: Macros, b: Macros): Macros {
  // A recipe with no fibre figure contributes nothing rather than zero, so a
  // week's total stays unknown only while every recipe in it is unknown.
  const fiber =
    a.fiber_g == null && b.fiber_g == null
      ? null
      : (a.fiber_g ?? 0) + (b.fiber_g ?? 0);

  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
    fiber_g: fiber,
  };
}

/**
 * Daily fibre target.
 *
 * Scaled to intake rather than fixed, which is how the dietary reference
 * actually reads: 14g per 1000 kcal. Someone eating 3,000 calories needs more
 * than someone eating 1,800, and a single 30g line would be wrong for both.
 * Falls back to 30g — near the adult average of the 25g and 38g figures
 * usually quoted for women and men — when no calorie goal is set.
 */
export const FIBER_PER_1000_KCAL = 14;
export const DEFAULT_FIBER_GOAL_G = 30;

export function dailyFiberGoal(dailyCalorieGoal: number | null): number {
  if (!dailyCalorieGoal) return DEFAULT_FIBER_GOAL_G;
  return Math.round((dailyCalorieGoal / 1000) * FIBER_PER_1000_KCAL);
}
