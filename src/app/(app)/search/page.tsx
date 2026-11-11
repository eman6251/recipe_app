import { PageHeader } from "@/components/page-header";
import { listBrowseRecipes } from "@/lib/queries/browse";
import { SearchView } from "./search-view";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, recipes] = await Promise.all([
    searchParams,
    listBrowseRecipes(),
  ]);

  return (
    <>
      <PageHeader
        title="Search"
        description="Your recipes and everything shared with you."
      />
      <SearchView recipes={recipes} initialQuery={q ?? ""} />
    </>
  );
}
