import { PageHeader, ComingSoon } from "@/components/page-header";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Recipe"
        description="NYT Cooking–style view with a portion multiplier."
      />
      <ComingSoon
        note={`The full recipe view (ingredients, steps, notes, servings multiplier) for id "${id}" is coming in Phase 4.`}
      />
    </>
  );
}
