import { History } from "lucide-react";
import { RecipeCardTile } from "./browse";
import type { BrowseRecipe } from "@/lib/queries/browse";

/**
 * Recently opened recipes, two across — the phone's first screen.
 *
 * On a phone you mostly return to something you were already cooking, so
 * what you opened last is a better opening gambit than the whole library.
 * Browsing is still underneath; it just isn't what greets you.
 *
 * Phone only. A laptop has the width to show the browse rows straight away
 * and a sidebar's worth of recents would only crowd them.
 */
export function RecentGrid({ recipes }: { recipes: BrowseRecipe[] }) {
  if (recipes.length === 0) return null;

  return (
    <section className="mb-8 md:hidden">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <History className="h-3.5 w-3.5" />
        Recent
      </h2>
      {/* items-start so a two-line title doesn't stretch the card beside it —
          uniform cards are what make a scroll of these readable. */}
      <ul className="grid grid-cols-2 items-start gap-x-4 gap-y-5">
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <RecipeCardTile recipe={recipe} />
          </li>
        ))}
      </ul>
    </section>
  );
}
