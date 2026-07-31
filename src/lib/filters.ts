/**
 * Recipe filters for the recipes page.
 *
 * Most filters read the recipe's tags, which come from the AI importer or are
 * typed by hand — so matching normalizes punctuation and accepts aliases
 * ("dairy-free" / "dairy free" / "dairyfree"). Cook-time filters are computed
 * from prep + cook minutes rather than tagged.
 */

export type Filterable = {
  tags: string[];
  prep_minutes: number | null;
  cook_minutes: number | null;
};

export type FilterOption = {
  id: string;
  label: string;
  match: (recipe: Filterable) => boolean;
};

export type FilterGroup = {
  id: string;
  label: string;
  options: FilterOption[];
};

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function tagged(...aliases: string[]): (recipe: Filterable) => boolean {
  const wanted = new Set(aliases.map(normalize));
  return (recipe) => recipe.tags.some((t) => wanted.has(normalize(t)));
}

function totalMinutes(recipe: Filterable): number | null {
  const prep = recipe.prep_minutes;
  const cook = recipe.cook_minutes;
  if (prep == null && cook == null) return null;
  return (prep ?? 0) + (cook ?? 0);
}

function within(limit: number): (recipe: Filterable) => boolean {
  return (recipe) => {
    const total = totalMinutes(recipe);
    return total != null && total <= limit;
  };
}

const MEAL_OPTIONS: FilterOption[] = [
  { id: "meal:breakfast", label: "Breakfast", match: tagged("breakfast", "brunch") },
  { id: "meal:lunch", label: "Lunch", match: tagged("lunch") },
  { id: "meal:dinner", label: "Dinner", match: tagged("dinner", "supper") },
  { id: "meal:dessert", label: "Dessert", match: tagged("dessert", "sweets") },
  { id: "meal:snack", label: "Snack", match: tagged("snack", "snacks") },
  { id: "meal:side", label: "Side dish", match: tagged("side", "side dish", "sides") },
];

const DIET_OPTIONS: FilterOption[] = [
  { id: "diet:high-protein", label: "High protein", match: tagged("high protein", "highprotein") },
  { id: "diet:vegetarian", label: "Vegetarian", match: tagged("vegetarian") },
  { id: "diet:vegan", label: "Vegan", match: tagged("vegan") },
  { id: "diet:dairy-free", label: "Dairy-free", match: tagged("dairy free", "dairyfree") },
  { id: "diet:gluten-free", label: "Gluten-free", match: tagged("gluten free", "glutenfree") },
  { id: "diet:low-carb", label: "Low carb", match: tagged("low carb", "lowcarb", "keto") },
];

const TIME_OPTIONS: FilterOption[] = [
  { id: "time:20", label: "Under 20 min", match: within(20) },
  { id: "time:30", label: "Under 30 min", match: within(30) },
  { id: "time:45", label: "Under 45 min", match: within(45) },
];

const EQUIPMENT_OPTIONS: FilterOption[] = [
  { id: "equip:one-pot", label: "One pot", match: tagged("one pot", "onepot", "one pan") },
  { id: "equip:sheet-pan", label: "Sheet pan", match: tagged("sheet pan", "sheetpan", "tray bake") },
  { id: "equip:slow-cooker", label: "Slow cooker", match: tagged("slow cooker", "crockpot", "crock pot") },
  { id: "equip:instant-pot", label: "Instant pot", match: tagged("instant pot", "instantpot", "pressure cooker") },
  { id: "equip:air-fryer", label: "Air fryer", match: tagged("air fryer", "airfryer") },
  { id: "equip:grill", label: "Grill", match: tagged("grill", "grilled", "bbq") },
  { id: "equip:no-cook", label: "No cook", match: tagged("no cook", "nocook", "raw") },
];

const POPULAR_OPTIONS: FilterOption[] = [
  { id: "pop:dinner", label: "Dinner", match: tagged("dinner", "supper") },
  { id: "pop:easy", label: "Easy", match: tagged("easy", "quick", "weeknight", "simple") },
  { id: "pop:meal-prep", label: "Meal prep", match: tagged("meal prep", "mealprep", "batch") },
  { id: "pop:high-protein", label: "High protein", match: tagged("high protein", "highprotein") },
  { id: "pop:dessert", label: "Dessert", match: tagged("dessert", "sweets") },
];

export const FILTER_GROUPS: FilterGroup[] = [
  { id: "popular", label: "Popular", options: POPULAR_OPTIONS },
  { id: "meal", label: "Meal types", options: MEAL_OPTIONS },
  { id: "diet", label: "Diets", options: DIET_OPTIONS },
  { id: "time", label: "Cook times", options: TIME_OPTIONS },
  { id: "equipment", label: "Equipment", options: EQUIPMENT_OPTIONS },
];

const OPTIONS_BY_ID = new Map(
  FILTER_GROUPS.flatMap((g) => g.options.map((o) => [o.id, o] as const)),
);

/**
 * Options within a group are an OR (any dinner *or* dessert), while separate
 * groups are an AND (a dinner *and* under 30 minutes) — the behaviour people
 * expect from faceted filters.
 */
export function matchesFilters<T extends Filterable>(
  recipe: T,
  selected: Set<string>,
): boolean {
  if (selected.size === 0) return true;

  return FILTER_GROUPS.every((group) => {
    const active = group.options.filter((o) => selected.has(o.id));
    if (active.length === 0) return true;
    return active.some((o) => o.match(recipe));
  });
}

/** How many of `recipes` each option would match, for the counts in the UI. */
export function filterCounts<T extends Filterable>(
  recipes: T[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [id, option] of OPTIONS_BY_ID) {
    counts.set(id, recipes.filter((r) => option.match(r)).length);
  }
  return counts;
}
