/**
 * Ingredient browsing: the vocabulary behind the Ingredients menu, and a
 * loose test for whether a recipe is really *about* an ingredient.
 */

export type IngredientEntry = {
  slug: string;
  label: string;
  /** Words that identify this ingredient in a title or ingredient line. */
  aliases: string[];
  /**
   * Phrases that contain an alias but mean something else — "rice noodles"
   * is not rice. Word boundaries handle single words (eggplant never matches
   * egg); these cover the multi-word cases.
   */
  excludes?: string[];
};

export type IngredientGroup = {
  id: string;
  label: string;
  items: IngredientEntry[];
};

const entry = (
  slug: string,
  label: string,
  ...aliases: string[]
): IngredientEntry => ({ slug, label, aliases: [label.toLowerCase(), ...aliases] });

const withExcludes = (
  base: IngredientEntry,
  ...excludes: string[]
): IngredientEntry => ({ ...base, excludes });

export const INGREDIENT_GROUPS: IngredientGroup[] = [
  {
    id: "protein",
    label: "Meat & seafood",
    items: [
      entry("chicken", "Chicken"),
      entry("beef", "Beef", "steak", "ground beef", "brisket"),
      entry("pork", "Pork", "bacon", "sausage"),
      entry("salmon", "Salmon"),
      entry("shrimp", "Shrimp", "prawn", "prawns"),
      entry("turkey", "Turkey"),
      entry("egg", "Eggs", "egg"),
    ],
  },
  {
    id: "veg",
    label: "Vegetables & fruits",
    items: [
      entry("sweet-potato", "Sweet potato", "sweet potatoes"),
      entry("potato", "Potato", "potatoes"),
      entry("zucchini", "Zucchini", "courgette"),
      entry("mushroom", "Mushroom", "mushrooms"),
      entry("spinach", "Spinach"),
      entry("broccoli", "Broccoli"),
      entry("tomato", "Tomato", "tomatoes"),
      entry("cabbage", "Cabbage"),
    ],
  },
  {
    id: "plant-protein",
    label: "Plant-based proteins",
    items: [
      entry("tofu", "Tofu"),
      entry("chickpea", "Chickpea", "chickpeas", "garbanzo"),
      entry("lentil", "Lentil", "lentils"),
      withExcludes(
        entry("bean", "Beans", "bean", "black beans"),
        "vanilla bean", "coffee bean", "green beans",
      ),
    ],
  },
  {
    id: "grain",
    label: "Rice, grains, pasta",
    items: [
      entry("pasta", "Pasta", "spaghetti", "penne", "macaroni"),
      entry("noodle", "Noodles", "noodle", "ramen"),
      withExcludes(
        entry("rice", "Rice"),
        "rice noodles", "rice paper", "rice vinegar", "rice flour", "rice wine",
      ),
      entry("quinoa", "Quinoa"),
      entry("oats", "Oats", "oat", "oatmeal"),
      withExcludes(entry("bread", "Bread", "toast"), "breadcrumbs", "bread crumbs"),
    ],
  },
];

export const INGREDIENTS_BY_SLUG = new Map(
  INGREDIENT_GROUPS.flatMap((g) => g.items.map((i) => [i.slug, i] as const)),
);

const normalize = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;

function mentions(haystack: string, aliases: string[]): boolean {
  const text = normalize(haystack);
  return aliases.some((a) => text.includes(normalize(a)));
}

export type PrimaryCandidate = {
  title: string;
  ingredients: { item: string; grams: number | null }[];
};

/**
 * Is this recipe *about* the ingredient, rather than merely containing it?
 *
 * There's no explicit "primary" flag, so this leans on two signals that
 * happen to be reliable: being named in the title (a recipe called "Chicken
 * Tikka" is about chicken), or being one of the heaviest ingredient lines by
 * weight. The weight test is what keeps a stray garnish from matching, and
 * a 3-line cap is what keeps "salt" out of every result.
 */
export function isPrimaryIngredient(
  recipe: PrimaryCandidate,
  aliases: string[],
  excludes: string[] = [],
): boolean {
  const hits = (text: string) =>
    mentions(text, aliases) && !mentions(text, excludes);

  if (hits(recipe.title)) return true;

  const weighed = recipe.ingredients
    .filter((i) => i.grams != null && i.grams > 0)
    .sort((a, b) => (b.grams ?? 0) - (a.grams ?? 0));

  // Fall back to appearing at all when nothing has been weighed yet.
  if (weighed.length === 0) {
    return recipe.ingredients.some((i) => hits(i.item));
  }

  const total = weighed.reduce((sum, i) => sum + (i.grams ?? 0), 0);
  return weighed.slice(0, 3).some(
    (i) =>
      hits(i.item) &&
      // At least a tenth of the dish by weight, so a splash of soy sauce in a
      // heavy stew doesn't make it a soy sauce recipe.
      (i.grams ?? 0) >= total * 0.1,
  );
}
