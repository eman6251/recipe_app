import { PageHeader } from "@/components/page-header";
import { getHomeData } from "@/lib/queries/discover";
import { RecipeRow } from "./recipe-row";


export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ author?: string }>;
}) {
  const { author } = await searchParams;
  const data = await getHomeData(author);

  const hasAnything =
    data.recentlyViewed.length > 0 ||
    data.recommended.length > 0 ||
    data.newlyShared.length > 0 ||
    data.byAuthor.length > 0;

  return (
    <>
      <PageHeader
        title="Welcome back"
        description="Your kitchen command center."
      />


      {!hasAnything ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-surface/60 p-10 text-center dark:border-white/15">
          <p className="font-medium">Nothing to show yet</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Add a few recipes and they&apos;ll start showing up here.
          </p>
        </div>
      ) : null}

      <RecipeRow title="Recently viewed" recipes={data.recentlyViewed} />

      <RecipeRow
        title="Recommended for you"
        recipes={data.recommended}
        emptyHint={
          data.cookedCount === 0
            ? "Cook a few meals (check them off in This Week) or rate some recipes, and suggestions will show up here."
            : undefined
        }
      />

      <RecipeRow title="New recipes" recipes={data.newlyShared} />

      <RecipeRow
        title="Recipes by"
        recipes={data.byAuthor}
        authors={data.authors}
        selectedAuthorId={data.selectedAuthorId}
        emptyHint="No recipes from this cook yet."
      />
    </>
  );
}
