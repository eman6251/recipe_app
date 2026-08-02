"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { FILTER_GROUPS } from "@/lib/filters";
import type { RecipeOption } from "@/lib/queries/planner";

const MEAL_OPTIONS = FILTER_GROUPS.find((g) => g.id === "meal")!.options;

/** Meal types are shown as chips, so exclude them from the tag list too. */
const MEAL_TAGS = new Set(
  MEAL_OPTIONS.map((o) => o.label.toLowerCase().replace(/[^a-z]/g, "")),
);

const inputClass =
  "w-full rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15";

/**
 * Searchable recipe list for the meal planner. A native <select> stops being
 * usable well before a recipe box reaches a few dozen entries, and can't
 * offer filtering at all.
 */
export function RecipePicker({
  recipes,
  value,
  onChange,
}: {
  recipes: RecipeOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [mealFilter, setMealFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState("");

  // Tags actually in use, most common first, minus the meal types.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) {
      for (const tag of r.tags ?? []) {
        const key = tag.trim().toLowerCase();
        if (!key || MEAL_TAGS.has(key.replace(/[^a-z]/g, ""))) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const meal = mealFilter
      ? MEAL_OPTIONS.find((o) => o.id === mealFilter)
      : null;

    return recipes.filter((r) => {
      // Recipes are filtered on tags, so give them the shape the matcher wants.
      if (meal && !meal.match({ tags: r.tags ?? [], prep_minutes: null, cook_minutes: null }))
        return false;
      if (tagFilter && !(r.tags ?? []).some((t) => t.toLowerCase() === tagFilter))
        return false;
      if (!q) return true;
      // Searching tags too means "thai" finds a dish that isn't named Thai.
      return (
        r.title.toLowerCase().includes(q) ||
        (r.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [recipes, query, mealFilter, tagFilter]);

  const selected = recipes.find((r) => r.id === value);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes"
          autoComplete="off"
          className={`${inputClass} pl-8`}
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1">
        {MEAL_OPTIONS.map((option) => {
          const active = mealFilter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setMealFilter(active ? null : option.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-amber-400 text-zinc-950"
                  : "border border-black/10 text-zinc-600 hover:bg-black/5 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {tags.length > 0 ? (
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className={inputClass}
        >
          <option value="">Any tag</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      ) : null}

      <ul className="max-h-56 overflow-y-auto rounded-lg border border-black/10 dark:border-white/10">
        {filtered.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No recipes match.
          </li>
        ) : (
          filtered.map((r) => {
            const active = r.id === value;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onChange(r.id)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-black/5 px-3 py-2 text-left transition-colors last:border-b-0 dark:border-white/5 ${
                    active
                      ? "bg-amber-400/15"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`text-sm leading-snug ${active ? "font-semibold" : ""}`}
                  >
                    {r.title}
                  </span>
                  {(r.tags ?? []).length > 0 ? (
                    <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {(r.tags ?? []).slice(0, 3).join(" · ")}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {selected ? (
          <>
            Selected: <strong>{selected.title}</strong>
          </>
        ) : (
          `${filtered.length} of ${recipes.length} — pick one`
        )}
      </p>
    </div>
  );
}
