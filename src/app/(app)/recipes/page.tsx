import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { listBrowseRecipes } from "@/lib/queries/browse";
import { Browse } from "./browse";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const [{ f }, recipes] = await Promise.all([
    searchParams,
    listBrowseRecipes(),
  ]);

  return (
    <>
      <PageHeader
        title="Recipes"
        description="Everything you've written, plus what other cooks have shared."
        action={
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" />
            Add recipe
          </Link>
        }
      />
      {/* Remount when the nav picks a different filter so it takes effect. */}
      <Browse key={f ?? "all"} recipes={recipes} initialFilter={f} />
    </>
  );
}
