import { createClient } from "@/lib/supabase/server";
import type { Macros } from "@/lib/types";

export type RecipeCard = {
  id: string;
  title: string;
  image_url: string | null;
  tags: string[];
  macros_per_serving: Macros | null;
  authorName: string;
  avgRating: number | null;
  ratingCount: number;
};

export type Author = { id: string; display_name: string };

type RecipeRow = {
  id: string;
  title: string;
  image_url: string | null;
  tags: string[];
  macros_per_serving: Macros | null;
  user_id: string;
  is_public: boolean;
  created_at: string;
};

/** Everything the home page needs, gathered in one pass. */
export type HomeData = {
  /** False for signed-out visitors, who only see shared recipes. */
  signedIn: boolean;
  recentlyViewed: RecipeCard[];
  recommended: RecipeCard[];
  newlyShared: RecipeCard[];
  byAuthor: RecipeCard[];
  authors: Author[];
  selectedAuthorId: string | null;
  cookedCount: number;
};

const CARD_FIELDS =
  "id, title, image_url, tags, macros_per_serving, user_id, is_public, created_at";

export async function getHomeData(authorId?: string): Promise<HomeData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: HomeData = {
    signedIn: !!user,
    recentlyViewed: [],
    recommended: [],
    newlyShared: [],
    byAuthor: [],
    authors: [],
    selectedAuthorId: null,
    cookedCount: 0,
  };
  if (!user) {
    // Signed out: RLS exposes only shared recipes, so browse those.
    const [{ data: shared }, { data: anonProfiles }, { data: anonRatings }] =
      await Promise.all([
        supabase.from("recipes").select(CARD_FIELDS),
        supabase.from("profiles").select("id, display_name"),
        supabase.from("recipe_ratings").select("recipe_id, rating"),
      ]);

    const names = new Map(
      (anonProfiles ?? []).map((p) => [p.id, p.display_name as string]),
    );
    const anonStats = new Map<string, { sum: number; count: number }>();
    for (const r of anonRatings ?? []) {
      const st = anonStats.get(r.recipe_id) ?? { sum: 0, count: 0 };
      st.sum += r.rating;
      st.count += 1;
      anonStats.set(r.recipe_id, st);
    }
    const cards = ((shared ?? []) as RecipeRow[]).map((r) => {
      const st = anonStats.get(r.id);
      return {
        id: r.id,
        title: r.title,
        image_url: r.image_url,
        tags: r.tags ?? [],
        macros_per_serving: r.macros_per_serving,
        authorName: names.get(r.user_id) ?? "Unknown",
        avgRating: st ? st.sum / st.count : null,
        ratingCount: st?.count ?? 0,
      };
    });

    return {
      ...empty,
      newlyShared: [...cards]
        .sort((a, b) => a.title.localeCompare(b.title))
        .slice(0, 12),
      // Stands in for "recommended" when there's no history to go on.
      recommended: cards
        .filter((c) => c.avgRating != null)
        .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
        .slice(0, 12),
    };
  }

  // Everything visible: own recipes plus anything shared.
  const [{ data: visible }, { data: profiles }, { data: ratings }] =
    await Promise.all([
      supabase.from("recipes").select(CARD_FIELDS),
      supabase.from("profiles").select("id, display_name"),
      supabase.from("recipe_ratings").select("recipe_id, rating, user_id"),
    ]);

  const recipes = (visible ?? []) as RecipeRow[];
  if (recipes.length === 0) return empty;

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name as string]),
  );

  const ratingStats = new Map<string, { sum: number; count: number }>();
  const myRatings = new Map<string, number>();
  for (const r of ratings ?? []) {
    const stat = ratingStats.get(r.recipe_id) ?? { sum: 0, count: 0 };
    stat.sum += r.rating;
    stat.count += 1;
    ratingStats.set(r.recipe_id, stat);
    if (r.user_id === user.id) myRatings.set(r.recipe_id, r.rating);
  }

  const toCard = (r: RecipeRow): RecipeCard => {
    const stat = ratingStats.get(r.id);
    return {
      id: r.id,
      title: r.title,
      image_url: r.image_url,
      tags: r.tags ?? [],
      macros_per_serving: r.macros_per_serving,
      authorName: nameById.get(r.user_id) ?? "Unknown",
      avgRating: stat ? stat.sum / stat.count : null,
      ratingCount: stat?.count ?? 0,
    };
  };

  const byId = new Map(recipes.map((r) => [r.id, r]));

  // ---- Recently viewed
  const { data: views } = await supabase
    .from("recipe_views")
    .select("recipe_id, viewed_at")
    .order("viewed_at", { ascending: false })
    .limit(20);

  const recentlyViewed = (views ?? [])
    .map((v) => byId.get(v.recipe_id))
    .filter((r): r is RecipeRow => !!r)
    .map(toCard);

  // ---- Cook history: meals planned and actually checked off as cooked.
  const { data: cooked } = await supabase
    .from("planned_meals")
    .select("recipe_id")
    .eq("cooked", true);

  const cookedIds = new Set((cooked ?? []).map((c) => c.recipe_id));

  // Taste profile: tags from what's been cooked, weighted up by good ratings.
  const tagScores = new Map<string, number>();
  const bump = (id: string, weight: number) => {
    for (const tag of byId.get(id)?.tags ?? []) {
      tagScores.set(tag, (tagScores.get(tag) ?? 0) + weight);
    }
  };
  for (const id of cookedIds) bump(id, 1);
  for (const [id, rating] of myRatings) {
    if (rating >= 4) bump(id, rating - 3); // 4★ → +1, 5★ → +2
  }

  const recommended = recipes
    .filter((r) => !cookedIds.has(r.id) && !myRatings.has(r.id))
    .map((r) => {
      const affinity = (r.tags ?? []).reduce(
        (sum, tag) => sum + (tagScores.get(tag) ?? 0),
        0,
      );
      const stat = ratingStats.get(r.id);
      // Ratings from other people are the main signal once tastes are known;
      // unrated recipes sit at neutral rather than being penalised.
      const quality = stat ? stat.sum / stat.count : 3;
      return { r, score: affinity * 2 + quality };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ r }) => toCard(r));

  // ---- By author: other cooks only. Your own recipes are a click away in
  // the recipe box, so this row is for discovering everyone else's.
  const authorIds = new Set(
    recipes.filter((r) => r.user_id !== user.id).map((r) => r.user_id),
  );
  const authors: Author[] = [...authorIds]
    .map((id) => ({ id, display_name: nameById.get(id) ?? "Unknown" }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  const selectedAuthorId =
    authorId && authorIds.has(authorId) ? authorId : (authors[0]?.id ?? null);

  const byAuthor = selectedAuthorId
    ? recipes
        .filter((r) => r.user_id === selectedAuthorId)
        .map(toCard)
        .sort((a, b) => a.title.localeCompare(b.title))
    : [];

  // What people have been publishing lately.
  const newlyShared = recipes
    .filter((r) => r.is_public)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 12)
    .map(toCard);

  return {
    signedIn: true,
    recentlyViewed,
    recommended,
    newlyShared,
    byAuthor,
    authors,
    selectedAuthorId,
    cookedCount: cookedIds.size,
  };
}
