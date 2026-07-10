import Link from "next/link";
import { Plus, Clock, Flame } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { listRecipes } from "@/lib/queries/recipes";

export default async function RecipesPage() {
  const recipes = await listRecipes();

  return (
    <>
      <PageHeader
        title="Recipes"
        description={`${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} in your box.`}
        action={
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add recipe
          </Link>
        }
      />

      {recipes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-white/50 p-10 text-center dark:border-white/15 dark:bg-white/[0.02]">
          <p className="font-medium">Your recipe box is empty</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Add your first recipe and start building the collection.
          </p>
          <Link
            href="/recipes/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add your first recipe
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => {
            const totalMinutes =
              (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
            return (
              <li key={recipe.id}>
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="flex h-full flex-col rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-emerald-500/50 dark:border-white/10 dark:bg-zinc-950"
                >
                  <h2 className="font-medium leading-snug">{recipe.title}</h2>
                  {recipe.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {recipe.description}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {totalMinutes > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {totalMinutes} min
                      </span>
                    ) : null}
                    {recipe.macros_per_serving ? (
                      <span className="inline-flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5" />
                        {Math.round(recipe.macros_per_serving.kcal)} kcal ·{" "}
                        {Math.round(recipe.macros_per_serving.protein_g)}g protein
                      </span>
                    ) : null}
                  </div>

                  {recipe.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recipe.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
