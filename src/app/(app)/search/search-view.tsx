"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { RecipeCardTile } from "../recipes/browse";
import type { BrowseRecipe } from "@/lib/queries/browse";

/**
 * Search across everything you can see.
 *
 * Filtered in the browser over a list the page already loaded. At this size —
 * dozens of recipes, not thousands — a round trip per keystroke would cost
 * more than the whole dataset weighs, and results that appear as you type beat
 * results that are theoretically better sorted.
 *
 * Matches titles, authors, tags and ingredients. Ingredients matter: "what can
 * I do with gochujang" is a question about a jar in the door of the fridge,
 * and the recipe that answers it rarely has the word in its title.
 */

function haystack(recipe: BrowseRecipe): string {
  return [
    recipe.title,
    recipe.authorName,
    ...recipe.tags,
    ...recipe.ingredients.map((i) => i.item),
  ]
    .join(" ")
    .toLowerCase();
}

export function SearchView({
  recipes,
  initialQuery = "",
}: {
  recipes: BrowseRecipe[];
  /** Carried in from the top bar's field, so the page opens on its results. */
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  // Keeps typing smooth when the list is long: the field updates now, the
  // results catch up a frame later.
  const deferred = useDeferredValue(query);

  const index = useMemo(
    () => recipes.map((recipe) => ({ recipe, text: haystack(recipe) })),
    [recipes],
  );

  const results = useMemo(() => {
    const terms = deferred.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    // Every term has to appear somewhere, so adding a word narrows rather
    // than widens — which is what people expect a second word to do.
    return index
      .filter(({ text }) => terms.every((t) => text.includes(t)))
      .map(({ recipe }) => recipe);
  }, [index, deferred]);

  const searching = deferred.trim().length > 0;

  return (
    <>
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          type="search"
          enterKeyHint="search"
          placeholder="Recipes, ingredients, people…"
          aria-label="Search recipes"
          className="w-full rounded-full border border-black/15 bg-canvas py-3 pl-10 pr-10 text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15"
        />
        {query ? (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {!searching ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Search {recipes.length} recipes by name, by who wrote them, by a tag,
          or by something in the ingredient list.
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nothing matches &ldquo;{deferred}&rdquo;.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            {results.length} {results.length === 1 ? "recipe" : "recipes"}
          </p>
          <ul className="grid grid-cols-2 items-start gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCardTile recipe={recipe} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
