import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getRecipe } from "@/lib/queries/recipes";
import { RecipeForm } from "../../recipe-form";
import { updateRecipe } from "../../actions";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const update = updateRecipe.bind(null, id);

  return (
    <>
      <PageHeader title={`Edit: ${recipe.title}`} />
      <RecipeForm initial={recipe} onSubmit={update} submitLabel="Save changes" />
    </>
  );
}
