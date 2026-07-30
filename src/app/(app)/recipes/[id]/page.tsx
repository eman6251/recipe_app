import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ExternalLink, Flame, Pencil } from "lucide-react";
import { currentUserId, getRecipe } from "@/lib/queries/recipes";
import { createClient } from "@/lib/supabase/server";
import { RecipeSocial } from "./recipe-social";
import { RecipeView } from "./recipe-view";
import { DeleteRecipeButton } from "./delete-button";
import { MacroButton } from "./macro-button";
import { RecipeImage } from "./recipe-image";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const macros = recipe.macros_per_serving;

  const supabase = await createClient();
  const [userId, { data: ratings }, { data: favorite }] = await Promise.all([
    currentUserId(),
    supabase.from("recipe_ratings").select("rating, user_id").eq("recipe_id", id),
    supabase
      .from("recipe_favorites")
      .select("recipe_id")
      .eq("recipe_id", id)
      .maybeSingle(),
  ]);

  const isOwner = recipe.user_id === userId;
  const ratingCount = ratings?.length ?? 0;
  const avgRating = ratingCount
    ? ratings!.reduce((s, r) => s + r.rating, 0) / ratingCount
    : null;
  const myRating = ratings?.find((r) => r.user_id === userId)?.rating ?? null;

  return (
    <article>
      <RecipeImage
        recipeId={recipe.id}
        imageUrl={recipe.image_url}
        title={recipe.title}
      />

      <header className="mb-6 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {recipe.title}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            <DeleteRecipeButton id={recipe.id} title={recipe.title} />
          </div>
        </div>

        {recipe.description ? (
          <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
            {recipe.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
          {recipe.prep_minutes || recipe.cook_minutes ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {recipe.prep_minutes ? `${recipe.prep_minutes} min prep` : null}
              {recipe.prep_minutes && recipe.cook_minutes ? " · " : null}
              {recipe.cook_minutes ? `${recipe.cook_minutes} min cook` : null}
            </span>
          ) : null}
          {macros ? (
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-4 w-4" />
              {Math.round(macros.kcal)} kcal · {Math.round(macros.protein_g)}g
              protein · {Math.round(macros.carbs_g)}g carbs ·{" "}
              {Math.round(macros.fat_g)}g fat
              <span className="text-zinc-400 dark:text-zinc-500">
                / serving
              </span>
            </span>
          ) : null}
          {recipe.source_url ? (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-amber-600 hover:underline dark:text-amber-400"
            >
              <ExternalLink className="h-4 w-4" />
              {recipe.source_note || "Source"}
            </a>
          ) : recipe.source_note ? (
            <span>{recipe.source_note}</span>
          ) : null}
        </div>

        {recipe.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <RecipeSocial
          recipeId={recipe.id}
          isOwner={isOwner}
          isPublic={recipe.is_public}
          myRating={myRating}
          avgRating={avgRating}
          ratingCount={ratingCount}
          isFavorite={!!favorite}
        />

        {isOwner ? <MacroButton recipeId={recipe.id} hasMacros={!!macros} /> : null}
      </header>

      <RecipeView recipe={recipe} />
    </article>
  );
}
