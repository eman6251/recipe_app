/**
 * Ingredient names that mean the same grocery product. Written as natural
 * phrases and normalized through canonicalKey() at load, so entries here
 * don't have to account for lowercasing or singularization.
 *
 * Deliberately conservative — a wrong merge silently corrupts quantities on
 * the shopping list, which is worse than leaving two lines separate. Anything
 * not covered here falls through to the model-backed resolver, which caches
 * what it learns.
 */

import { canonicalKey } from "@/lib/fridge";

const PAIRS: [alias: string, canonical: string][] = [
  // Alliums / herbs
  ["scallions", "green onions"],
  ["spring onions", "green onions"],
  ["fresh coriander", "cilantro"],
  ["coriander leaves", "cilantro"],
  // NB: bare "coriander" is intentionally absent — in US recipes it's the
  // seed/spice, not the leaf, so merging it into cilantro would be wrong.

  // Vegetables
  ["aubergine", "eggplant"],
  ["courgette", "zucchini"],
  ["rocket", "arugula"],
  ["beetroot", "beets"],
  ["swede", "rutabaga"],
  ["mangetout", "snow peas"],
  ["cos lettuce", "romaine lettuce"],
  ["capsicum", "bell pepper"],

  // Legumes / proteins
  ["garbanzo beans", "chickpeas"],
  ["garbanzos", "chickpeas"],
  ["prawns", "shrimp"],
  ["beef mince", "ground beef"],
  ["minced beef", "ground beef"],
  ["pork mince", "ground pork"],
  ["minced pork", "ground pork"],

  // Baking / dry goods
  ["plain flour", "all purpose flour"],
  ["self raising flour", "self rising flour"],
  ["bicarbonate of soda", "baking soda"],
  ["bicarb", "baking soda"],
  ["cornflour", "cornstarch"],
  ["icing sugar", "powdered sugar"],
  ["confectioners sugar", "powdered sugar"],
  ["caster sugar", "superfine sugar"],
  ["sultanas", "golden raisins"],
  ["porridge oats", "rolled oats"],

  // Dairy
  ["double cream", "heavy cream"],
  ["single cream", "light cream"],
  ["natural yoghurt", "plain yogurt"],
  ["yoghurt", "yogurt"],

  // Pantry
  ["soya sauce", "soy sauce"],
  ["tomato puree", "tomato paste"],
  ["chilli flakes", "chili flakes"],
  ["chilli powder", "chili powder"],
];

/** alias key → canonical key, both in canonicalKey() space. */
export const BUILTIN_SYNONYMS: ReadonlyMap<string, string> = new Map(
  PAIRS.map(([alias, canonical]) => [
    canonicalKey(alias),
    canonicalKey(canonical),
  ]),
);
