import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { INGREDIENTS_BY_SLUG, isPrimaryIngredient } from "@/lib/ingredients";
import { listBrowseRecipes } from "@/lib/queries/browse";
import { RecipeCardTile } from "../../recipes/browse";

export default async function IngredientPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ingredient = INGREDIENTS_BY_SLUG.get(slug);
  if (!ingredient) notFound();

  const all = await listBrowseRecipes();
  const matches = all.filter((r) => isPrimaryIngredient(r, ingredient.aliases, ingredient.excludes));

  return (
    <>
      <Link
        href="/ingredients"
        className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ChevronLeft className="h-4 w-4" />
        All ingredients
      </Link>

      <PageHeader
        title={`${ingredient.label} recipes`}
        description={`${matches.length} ${matches.length === 1 ? "recipe" : "recipes"} built around ${ingredient.label.toLowerCase()}.`}
      />

      {matches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-surface/60 p-10 text-center dark:border-white/15">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nothing here yet — recipes show up once {ingredient.label.toLowerCase()}{" "}
            is one of their main ingredients.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {matches.map((r) => (
            <li key={r.id}>
              <RecipeCardTile recipe={r} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
