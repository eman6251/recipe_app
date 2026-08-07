import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  currentUserId,
  listPantryItems,
  listRecipesWithIngredients,
} from "@/lib/queries/recipes";
import { RecipeBrowser } from "./recipe-browser";

export default async function RecipesPage() {
  const [recipes, pantry, userId] = await Promise.all([
    listRecipesWithIngredients(),
    listPantryItems(),
    currentUserId(),
  ]);

  return (
    <>
      <PageHeader
        title="Recipe Box"
        description={`${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} you've written or saved.`}
        info={
          <>
            Your own recipes plus any shared ones you&apos;ve saved. Other people&apos;s
            recipes stay out of here until you save them, so browsing doesn&apos;t
            clutter your collection. <strong>What can I make?</strong> lists
            what&apos;s in your fridge and shows only recipes you could cook right
            now with those plus your pantry staples.
          </>
        }
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
      <RecipeBrowser recipes={recipes} pantry={pantry} userId={userId} />
    </>
  );
}
