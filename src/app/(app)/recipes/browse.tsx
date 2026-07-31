"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChefHat, Clock, Star } from "lucide-react";
import {
  FILTER_GROUPS,
  filterCounts,
  matchesFilters,
  type FilterOption,
} from "@/lib/filters";
import { FilterPanel } from "@/app/(app)/recipe-box/filter-panel";
import type { BrowseRecipe } from "@/lib/queries/browse";

/** Rows shown when nothing is filtered — a starting point, not a taxonomy. */
const FEATURED_ROWS: { title: string; optionId: string }[] = [
  { title: "Easy weeknight dinners", optionId: "pop:easy" },
  { title: "Under 30 minutes", optionId: "time:30" },
  { title: "High protein", optionId: "diet:high-protein" },
  { title: "Made for meal prep", optionId: "pop:meal-prep" },
  { title: "Something sweet", optionId: "meal:dessert" },
  { title: "Vegetarian", optionId: "diet:vegetarian" },
];

const OPTION_BY_ID = new Map(
  FILTER_GROUPS.flatMap((g) => g.options.map((o) => [o.id, o] as const)),
);

export function RecipeCardTile({ recipe }: { recipe: BrowseRecipe }) {
  const minutes = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  return (
    <Link href={`/recipes/${recipe.id}`} className="group block">
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-black/10 bg-surface transition-colors group-hover:border-amber-400/60 dark:border-white/10">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-700">
            <ChefHat className="h-8 w-8" />
          </span>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">
        {recipe.title}
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="truncate">{recipe.authorName}</span>
        {recipe.avgRating != null ? (
          <span className="inline-flex shrink-0 items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {recipe.avgRating.toFixed(1)}
          </span>
        ) : null}
        {minutes > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {minutes}m
          </span>
        ) : null}
      </p>
    </Link>
  );
}

function Row({
  title,
  recipes,
  onSeeAll,
}: {
  title: string;
  recipes: BrowseRecipe[];
  onSeeAll: () => void;
}) {
  if (recipes.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <button
          onClick={onSeeAll}
          className="text-sm font-medium text-amber-600 hover:underline dark:text-amber-400"
        >
          See all {recipes.length}
        </button>
      </div>
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {recipes.slice(0, 12).map((r) => (
          <li key={r.id} className="w-44 shrink-0 sm:w-52">
            <RecipeCardTile recipe={r} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Browse({
  recipes,
  initialFilter,
}: {
  recipes: BrowseRecipe[];
  /** Filter id from the nav menu, e.g. "diet:vegan". */
  initialFilter?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialFilter && OPTION_BY_ID.has(initialFilter) ? [initialFilter] : []),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const counts = useMemo(() => filterCounts(recipes), [recipes]);

  const toggleFilter = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filtered = useMemo(
    () => recipes.filter((r) => matchesFilters(r, selected)),
    [recipes, selected],
  );

  const activeLabels = [...selected]
    .map((id) => OPTION_BY_ID.get(id))
    .filter((o): o is FilterOption => !!o);

  const showRows = selected.size === 0;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterPanel
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          selected={selected}
          onToggle={toggleFilter}
          onClear={() => setSelected(new Set())}
          counts={counts}
        />
        {activeLabels.map((option) => (
          <button
            key={option.id}
            onClick={() => toggleFilter(option.id)}
            className="rounded-full border border-amber-400/50 px-3 py-1 text-sm text-amber-700 transition-colors hover:bg-amber-400/10 dark:text-amber-400"
          >
            {option.label} ✕
          </button>
        ))}
      </div>

      {showRows ? (
        <>
          {FEATURED_ROWS.map(({ title, optionId }) => {
            const option = OPTION_BY_ID.get(optionId);
            if (!option) return null;
            return (
              <Row
                key={optionId}
                title={title}
                recipes={recipes.filter((r) => option.match(r))}
                onSeeAll={() => setSelected(new Set([optionId]))}
              />
            );
          })}

          <Row
            title="Everything"
            recipes={recipes}
            onSeeAll={() => setFiltersOpen(true)}
          />
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
            {filtered.length} {filtered.length === 1 ? "recipe" : "recipes"}
          </p>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/15 bg-surface/60 p-10 text-center dark:border-white/15">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Nothing matches those filters.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((r) => (
                <li key={r.id}>
                  <RecipeCardTile recipe={r} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
