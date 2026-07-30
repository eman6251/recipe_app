import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  listPantryItems,
  listRecipesWithIngredients,
} from "@/lib/queries/recipes";
import { RecipeBrowser } from "./recipe-browser";

export default async function RecipesPage() {
  const [recipes, pantry] = await Promise.all([
    listRecipesWithIngredients(),
    listPantryItems(),
  ]);

  return (
    <>
      <PageHeader
        title="Recipes"
        description={`${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} in your box.`}
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
      <RecipeBrowser recipes={recipes} pantry={pantry} />
    </>
  );
}
