/**
 * What part of a shop an ingredient comes from.
 *
 * A shopping list sorted alphabetically sends you back and forth across the
 * store — apples, bacon, carrots, cheddar — when the only order that saves
 * steps is the order you walk in. This groups by aisle instead, roughly the
 * route of a supermarket: produce by the door, the long dry-goods aisles,
 * the meat counter at the back, then the cold and frozen cases on the way
 * to the tills.
 *
 * Keyword matching, not a model: an aisle is a stable fact about a
 * foodstuff, so a lookup gets it right for free and gets it right the same
 * way every time. Anything unrecognised lands in Other at the bottom, which
 * is a worse place to find something but never a wrong one.
 */

import { canonicalKey } from "@/lib/fridge";

/**
 * Crude singular, so a keyword matches the plural on the label.
 *
 * Recipes say "green onions", "large eggs", "corn tortillas"; a keyword list
 * says onion, egg, tortilla. Without this they miss, and the item lands in
 * Other looking like the list has never heard of eggs.
 */
function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (/(s|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export type Aisle = {
  id: string;
  label: string;
  /** Matched against the ingredient's words; longest phrase wins. */
  keywords: string[];
};

/** In shopping order. The index is the sort key. */
export const AISLES: Aisle[] = [
  {
    id: "produce",
    label: "Produce",
    keywords: [
      "apple", "avocado", "banana", "basil", "bean sprouts", "bell pepper",
      "berries", "blueberry", "blueberries", "bok choy", "broccoli", "cabbage",
      "carrot", "cauliflower", "celery", "chilli", "chili", "cilantro",
      "coriander", "corn", "cucumber", "dill", "eggplant", "garlic", "ginger",
      "grape", "green onion", "greens", "herbs", "jalapeno", "kale", "leek",
      "lemon", "lemongrass", "lettuce", "lime", "mango", "mint", "mushroom",
      "onion", "orange", "parsley", "pear", "pepper flakes fresh", "pineapple",
      "potato", "radish", "rosemary", "sage", "scallion", "shallot", "spinach",
      "sweet potato", "thyme", "tomato", "zucchini",
    ],
  },
  {
    id: "dry",
    label: "Dry goods",
    keywords: [
      "almond flour", "baking powder", "baking soda", "barley", "bean",
      "breadcrumbs", "broth", "brown sugar", "cannellini", "canned", "cereal",
      "chia", "chickpea", "chocolate chips", "cocoa", "coconut milk",
      "cornmeal", "cornstarch", "couscous", "flour", "granola", "lentil",
      "noodle", "oats", "panko", "pasta", "peanut butter", "quinoa", "raisin",
      "ramen", "rice", "seeds", "stock", "sugar", "tahini", "tomato paste",
      "tortilla", "walnut", "yeast", "almond", "cashew", "peanut", "pecan",
    ],
  },
  {
    id: "meat",
    label: "Meat & fish",
    keywords: [
      "anchovy", "bacon", "beef", "chicken", "chorizo", "cod", "duck", "ham",
      "lamb", "meatball", "mince", "pork", "prawn", "prosciutto", "salmon",
      "sardine", "sausage", "scallop", "shrimp", "steak", "thigh", "tilapia",
      "tofu", "tuna", "turkey",
    ],
  },
  {
    id: "frozen",
    label: "Frozen",
    keywords: ["frozen", "ice cream", "edamame", "puff pastry"],
  },
  {
    id: "dairy",
    label: "Dairy & eggs",
    keywords: [
      "butter", "buttermilk", "cheddar", "cheese", "cottage cheese", "cream",
      "cream cheese", "creme fraiche", "egg", "feta", "ghee", "milk",
      "mozzarella", "parmesan", "ricotta", "sour cream", "yoghurt", "yogurt",
    ],
  },
  {
    id: "bakery",
    label: "Bakery",
    keywords: ["bagel", "baguette", "bread", "brioche", "bun", "pita", "roll", "naan"],
  },
  {
    id: "sauces",
    label: "Sauces & condiments",
    keywords: [
      "chilli oil", "chili oil", "fish sauce", "gochujang", "honey", "hot sauce",
      "hoisin", "jam", "ketchup", "maple syrup", "mayonnaise", "mirin", "miso",
      "mustard", "oil", "olive oil", "oyster sauce", "pesto", "salsa",
      "sesame oil", "soy sauce", "sriracha", "syrup", "vinegar", "worcestershire", "aminos",
    ],
  },
  {
    id: "spices",
    label: "Spices & seasonings",
    keywords: [
      "allspice", "bay leaf", "cardamom", "cayenne", "chili powder", "cinnamon",
      "cumin", "curry powder", "garlic powder", "nutmeg", "onion powder",
      "oregano", "paprika", "pepper", "red pepper flakes", "salt", "seasoning",
      "spice", "turmeric", "vanilla",
    ],
  },
  {
    id: "drinks",
    label: "Drinks",
    keywords: ["beer", "coffee", "juice", "soda", "tea", "wine", "water"],
  },
];

export const OTHER_AISLE: Aisle = { id: "other", label: "Other", keywords: [] };

/**
 * Every keyword across every aisle, longest phrase first.
 *
 * Order matters: "sour cream" has to beat "cream", "sweet potato" has to beat
 * "potato", and "peanut butter" has to beat both "peanut" and "butter" — it's
 * a jar from the dry aisle, not a dairy product.
 */
const LOOKUP: { words: string[]; aisle: Aisle }[] = AISLES.flatMap((aisle) =>
  aisle.keywords.map((keyword) => ({
    words: keyword.split(" ").map(singular),
    aisle,
  })),
).sort(
  (a, b) =>
    b.words.length - a.words.length ||
    b.words.join("").length - a.words.join("").length,
);

export function aisleFor(item: string): Aisle {
  const words = new Set(canonicalKey(item).split(" ").map(singular));
  if (words.size === 0) return OTHER_AISLE;

  // "Frozen peas" is a trip to the freezer whatever the pea says otherwise.
  if (words.has("frozen")) return AISLES.find((a) => a.id === "frozen")!;

  for (const { words: keyword, aisle } of LOOKUP) {
    if (keyword.every((w) => words.has(w))) return aisle;
  }
  return OTHER_AISLE;
}

/** Sort position; Other sits last by construction. */
export function aisleRank(item: string): number {
  const aisle = aisleFor(item);
  const index = AISLES.findIndex((a) => a.id === aisle.id);
  return index === -1 ? AISLES.length : index;
}
