/**
 * Weight → cup-and-spoon conversion, for recipes written entirely in grams.
 *
 * This needs density, which is a property of the food, not of the units: a cup
 * of flour is 125g and a cup of honey is 340g. There's no formula, only a
 * table — but it's a short, static, free one, and the couple of dozen
 * ingredients people actually measure by volume cover most of what a home
 * recipe asks for.
 *
 * Grams per US cup rather than per millilitre, because that's how cooking
 * references publish it and because the spoons divide cleanly: a cup is 16
 * tablespoons is 48 teaspoons, so the whole table needs one number per food.
 *
 * Accuracy: these are good to roughly ±10% for liquids and powders, worse for
 * anything that packs or fluffs — flour spooned versus scooped genuinely
 * varies by a fifth. Conversions are therefore shown as approximate, and the
 * gram figure stays available, because for baking the scale is still right.
 */

import { canonicalKey } from "@/lib/fridge";

const TBSP_PER_CUP = 16;
const TSP_PER_CUP = 48;

/** Grams in one US cup. */
const GRAMS_PER_CUP: Record<string, number> = {
  // ---- liquids
  water: 236,
  milk: 244,
  "almond milk": 240,
  "coconut milk": 240,
  buttermilk: 245,
  "heavy cream": 238,
  cream: 238,
  "sour cream": 230,
  yogurt: 245,
  "greek yogurt": 250,
  stock: 240,
  broth: 240,
  "lemon juice": 239,
  "lime juice": 239,
  vinegar: 239,
  "soy sauce": 255,
  "fish sauce": 250,
  "maple syrup": 322,
  honey: 340,
  molasses: 337,

  // ---- fats
  oil: 216,
  "olive oil": 216,
  "vegetable oil": 218,
  "sesame oil": 218,
  "coconut oil": 218,
  butter: 227,

  // ---- flours and powders
  flour: 125,
  "bread flour": 127,
  "whole wheat flour": 120,
  "almond flour": 96,
  "coconut flour": 112,
  cornstarch: 128,
  cornmeal: 157,
  "cocoa powder": 85,
  "protein powder": 112,
  "baking powder": 192,
  "baking soda": 220,
  "breadcrumbs": 108,
  "panko": 60,

  // ---- sugars
  sugar: 200,
  "brown sugar": 213,
  "powdered sugar": 120,
  "icing sugar": 120,

  // ---- grains and pulses
  rice: 185,
  "cooked rice": 158,
  quinoa: 170,
  "rolled oats": 90,
  oats: 90,
  couscous: 173,
  lentils: 192,
  "chia seeds": 170,

  // ---- pastes and spreads
  "peanut butter": 258,
  tahini: 240,
  "tomato paste": 262,
  ketchup: 272,
  mayonnaise: 220,
  mustard: 249,
  hummus: 246,

  // ---- dairy and solids sold loose
  "grated parmesan": 100,
  "shredded cheese": 113,
  "cream cheese": 232,
  "chocolate chips": 170,
  raisins: 145,

  // ---- seasonings, where a teaspoon is the realistic unit
  salt: 292,
  "kosher salt": 145,
  "black pepper": 118,
  paprika: 110,
  cumin: 100,
  cinnamon: 132,
  "garlic powder": 154,
  "onion powder": 128,
  "chili powder": 128,
  "curry powder": 112,
  oregano: 45,
  thyme: 45,
  "red pepper flakes": 96,
};

/**
 * Longest keys first, so "brown sugar" wins over "sugar" and "almond flour"
 * over "flour". Without this the match depends on object key order, which is
 * a bug waiting for someone to alphabetise the table.
 */
const DENSITY_KEYS = Object.keys(GRAMS_PER_CUP).sort(
  (a, b) => b.split(" ").length - a.split(" ").length || b.length - a.length,
);

/** Grams per cup for an ingredient line, or null if it isn't in the table. */
export function densityFor(item: string): number | null {
  const key = canonicalKey(item);
  if (!key) return null;

  const words = new Set(key.split(" "));
  for (const candidate of DENSITY_KEYS) {
    // Every word of the table entry has to appear in the ingredient, so
    // "extra virgin olive oil" matches "olive oil" but "oil" alone doesn't
    // match "oil-packed tuna" any more loosely than it should.
    if (candidate.split(" ").every((w) => words.has(w))) {
      return GRAMS_PER_CUP[candidate];
    }
  }
  return null;
}

/** Kitchen-shaped fractions. Anything else is a measurement you can't make. */
const NICE_FRACTIONS = [0, 1 / 8, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1];

function snap(value: number): number {
  const whole = Math.floor(value);
  const frac = value - whole;

  // Past a few cups nobody cares about eighths; quarters read better.
  if (whole >= 3) return Math.round(value * 4) / 4;

  const nearest = NICE_FRACTIONS.reduce((best, f) =>
    Math.abs(f - frac) < Math.abs(best - frac) ? f : best,
  );
  return whole + nearest;
}

export type VolumeMeasure = { amount: number; unit: string };

/**
 * The most natural cup/spoon measure for a weight of something.
 *
 * Picks the largest unit that doesn't produce a silly number — a quarter cup
 * rather than four tablespoons, a tablespoon rather than three teaspoons —
 * since the point is to reach for one scoop instead of counting out twelve.
 */
export function gramsToVolume(
  item: string,
  grams: number,
): VolumeMeasure | null {
  const perCup = densityFor(item);
  if (!perCup || grams <= 0) return null;

  const cups = grams / perCup;

  // Snap before deciding whether a unit fits, not after. Judging the raw
  // figure sends 0.99 tablespoons of honey down to "3 tsp" when the answer
  // everyone wants is "1 tbsp".
  const asCups = snap(cups);
  if (asCups >= 0.25) {
    return { amount: asCups, unit: asCups <= 1 ? "cup" : "cups" };
  }

  const asTbsp = snap(cups * TBSP_PER_CUP);
  if (asTbsp >= 1) return { amount: asTbsp, unit: "tbsp" };

  const tsp = cups * TSP_PER_CUP;
  // A quarter teaspoon is the smallest spoon in most drawers; below that the
  // honest answer is "a pinch", not "0.03 tsp".
  if (tsp < 0.125) return { amount: 0, unit: "pinch" };
  return { amount: Math.max(0.25, snap(tsp)), unit: "tsp" };
}

/** Whether any line on a recipe could be converted at all. */
export function hasConvertibleLines(
  items: { item: string; grams: number | null }[],
): boolean {
  return items.some((i) => i.grams != null && densityFor(i.item) != null);
}
