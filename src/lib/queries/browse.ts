import { createClient } from "@/lib/supabase/server";
import type { Macros } from "@/lib/types";

/** A recipe card carrying everything the browse filters need. */
export type BrowseRecipe = {
  id: string;
  title: string;
  image_url: string | null;
  tags: string[];
  prep_minutes: number | null;
  cook_minutes: number | null;
  macros_per_serving: Macros | null;
  authorName: string;
  avgRating: number | null;
  ratingCount: number;
  ingredients: { item: string; grams: number | null }[];
};

type Row = {
  id: string;
  title: string;
  image_url: string | null;
  tags: string[] | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  macros_per_serving: Macros | null;
  user_id: string;
  recipe_ingredients: { item: string; grams: number | null }[] | null;
};

/**
 * Every recipe the signed-in user can see — their own plus anything shared.
 * RLS does the filtering, so this deliberately doesn't scope by owner the way
 * the recipe-box queries do.
 */
export async function listBrowseRecipes(): Promise<BrowseRecipe[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: rows }, { data: profiles }, { data: ratings }] =
    await Promise.all([
      supabase
        .from("recipes")
        .select(
          "id, title, image_url, tags, prep_minutes, cook_minutes, macros_per_serving, user_id, recipe_ingredients (item, grams)",
        )
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, display_name"),
      supabase.from("recipe_ratings").select("recipe_id, rating"),
    ]);

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name as string]),
  );

  const stats = new Map<string, { sum: number; count: number }>();
  for (const r of ratings ?? []) {
    const s = stats.get(r.recipe_id) ?? { sum: 0, count: 0 };
    s.sum += r.rating;
    s.count += 1;
    stats.set(r.recipe_id, s);
  }

  return ((rows ?? []) as Row[]).map((r) => {
    const stat = stats.get(r.id);
    return {
      id: r.id,
      title: r.title,
      image_url: r.image_url,
      tags: r.tags ?? [],
      prep_minutes: r.prep_minutes,
      cook_minutes: r.cook_minutes,
      macros_per_serving: r.macros_per_serving,
      authorName: nameById.get(r.user_id) ?? "Unknown",
      avgRating: stat ? stat.sum / stat.count : null,
      ratingCount: stat?.count ?? 0,
      ingredients: r.recipe_ingredients ?? [],
    };
  });
}
