import type { Macros } from "@/lib/types";

export const ZERO_MACROS: Macros = {
  kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
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
  };
}

export function sumMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
  };
}
