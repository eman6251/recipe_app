"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, Flame, Refrigerator, X } from "lucide-react";
import { matchRecipe } from "@/lib/fridge";
import { filterCounts, matchesFilters } from "@/lib/filters";
import { FilterPanel } from "./filter-panel";
import { ShareToggle } from "./share-toggle";
import type { PantryItem, RecipeWithIngredients } from "@/lib/types";

const inputClass =
  "rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15";

export function RecipeBrowser({
  recipes,
  pantry,
  userId,
}: {
  recipes: RecipeWithIngredients[];
  pantry: PantryItem[];
  /** Saved recipes belong to someone else, so only own ones can be shared. */
  userId: string | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fridgeOpen, setFridgeOpen] = useState(false);
  const [fridgeInput, setFridgeInput] = useState("");
  const [fridgeItems, setFridgeItems] = useState<string[]>([]);

  const addFridgeItems = () => {
    const items = fridgeInput
      .split(/[,\n]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .filter((s) => !fridgeItems.includes(s));
    if (items.length) setFridgeItems((prev) => [...prev, ...items]);
    setFridgeInput("");
  };

  const counts = useMemo(() => filterCounts(recipes), [recipes]);

  const toggleFilter = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filtered = useMemo(() => {
    let out = recipes.filter((r) => matchesFilters(r, selected));

    if (fridgeOpen && fridgeItems.length > 0) {
      const pantryNames = pantry.map((p) => p.name);
      out = out.filter(
        (r) =>
          r.recipe_ingredients.length > 0 &&
          matchRecipe(
            r.recipe_ingredients.map((ing) => ing.item),
            fridgeItems,
            pantryNames,
          ).canMake,
      );
    }

    return out;
  }, [recipes, selected, fridgeOpen, fridgeItems, pantry]);

  return (
    <>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPanel
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          selected={selected}
          onToggle={toggleFilter}
          onClear={() => setSelected(new Set())}
          counts={counts}
        />

        {selected.size > 0 ? (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {filtered.length} of {recipes.length}
          </span>
        ) : null}

        <button
          onClick={() => setFridgeOpen((o) => !o)}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            fridgeOpen
              ? "bg-amber-400 text-zinc-950"
              : "bg-surface text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10 border border-black/10 dark:border-white/10"
          }`}
        >
          <Refrigerator className="h-4 w-4" />
          What can I make?
        </button>
      </div>

      {/* Fridge search panel */}
      {fridgeOpen ? (
        <section className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-surface p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            List what&apos;s in your fridge — only recipes you can make with
            these plus your{" "}
            <Link
              href="/pantry"
              className="text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
            >
              {pantry.length} pantry staples
            </Link>{" "}
            will show.
          </p>
          <div className="flex gap-2">
            <input
              value={fridgeInput}
              onChange={(e) => setFridgeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFridgeItems();
                }
              }}
              placeholder="chicken thighs, spinach, feta"
              className={`${inputClass} w-full max-w-md`}
            />
            <button
              onClick={addFridgeItems}
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
            >
              Add
            </button>
          </div>
          {fridgeItems.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {fridgeItems.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 py-1 pl-3 pr-1.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                >
                  {item}
                  <button
                    onClick={() =>
                      setFridgeItems((prev) => prev.filter((i) => i !== item))
                    }
                    aria-label={`Remove ${item}`}
                    className="rounded-full p-0.5 text-amber-600/60 hover:text-amber-800 dark:text-amber-400/60 dark:hover:text-amber-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-surface/60 p-10 text-center dark:border-white/15">
          <p className="font-medium">
            {recipes.length === 0 ? "Your recipe box is empty" : "No matches"}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {recipes.length === 0
              ? "Add your first recipe and start building the collection."
              : fridgeOpen && fridgeItems.length > 0
                ? "Nothing can be made with only those ingredients + pantry staples. Add more ingredients, or check your pantry list is complete."
                : "No recipes with that tag yet."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((recipe) => {
            const totalMinutes =
              (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
            return (
              <li key={recipe.id} className="relative">
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-black/10 bg-surface transition-colors hover:border-amber-500/50 dark:border-white/10"
                >
                  {recipe.image_url ? (
                    <Image
                      src={recipe.image_url}
                      alt=""
                      width={600}
                      height={320}
                      className="aspect-[3/2] w-full object-cover"
                      unoptimized
                    />
                  ) : null}
                  <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-medium leading-snug">{recipe.title}</h2>
                  {recipe.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {recipe.description}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {totalMinutes > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {totalMinutes} min
                      </span>
                    ) : null}
                    {recipe.macros_per_serving ? (
                      <span className="inline-flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5" />
                        {Math.round(recipe.macros_per_serving.kcal)} kcal ·{" "}
                        {Math.round(recipe.macros_per_serving.protein_g)}g
                        protein
                      </span>
                    ) : null}
                  </div>

                  {/* Capped at three: the importer emits meal type, diet and
                      equipment tags, which wrapped to several lines and made
                      cards in a row wildly different heights. */}
                  {recipe.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {recipe.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="truncate rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                        >
                          {tag}
                        </span>
                      ))}
                      {recipe.tags.length > 3 ? (
                        <span
                          title={recipe.tags.slice(3).join(", ")}
                          className="rounded-full px-1 py-0.5 text-xs text-zinc-500 dark:text-zinc-400"
                        >
                          +{recipe.tags.length - 3}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  </div>
                </Link>
                {userId && recipe.user_id === userId ? (
                  <ShareToggle
                    recipeId={recipe.id}
                    isPublic={recipe.is_public}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
