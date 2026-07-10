// Domain types mirroring supabase/migrations. Once the Supabase CLI is
// linked we can generate these (`supabase gen types`), but hand-rolled
// types keep us moving and stay friendlier to read.

export type Macros = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Recipe = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  source_note: string | null;
  servings: number;
  prep_minutes: number | null;
  cook_minutes: number | null;
  instructions: string[];
  notes: string | null;
  tags: string[];
  image_url: string | null;
  macros_per_serving: Macros | null;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  position: number;
  group_name: string | null;
  quantity: number | null;
  unit: string | null;
  item: string;
  note: string | null;
  grams: number | null;
  fdc_id: number | null;
  macros: Macros | null;
  created_at: string;
};

export type RecipeWithIngredients = Recipe & {
  recipe_ingredients: RecipeIngredient[];
};

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export type PlannedMeal = {
  id: string;
  user_id: string;
  recipe_id: string;
  planned_on: string; // ISO date
  meal_slot: MealSlot;
  servings: number;
  cooked: boolean;
  created_at: string;
};

export type PantryItem = {
  id: string;
  user_id: string;
  name: string;
  small_amount_g: number | null;
  created_at: string;
};

/** Ingredient fields as edited in the recipe form (no ids yet). */
export type IngredientInput = {
  group_name?: string | null;
  quantity: number | null;
  unit: string | null;
  item: string;
  note?: string | null;
  grams?: number | null;
  fdc_id?: number | null;
  macros?: Macros | null;
};
