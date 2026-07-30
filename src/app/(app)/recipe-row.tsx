"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChefHat, Star } from "lucide-react";
import type { Author, RecipeCard } from "@/lib/queries/discover";

function Card({ recipe }: { recipe: RecipeCard }) {
  return (
    <li className="w-40 shrink-0 sm:w-48">
      <Link href={`/recipes/${recipe.id}`} className="group block">
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-black/10 bg-canvas transition-colors group-hover:border-amber-500/50 dark:border-white/10">
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
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="truncate">{recipe.authorName}</span>
          {recipe.avgRating != null ? (
            <span className="inline-flex shrink-0 items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {recipe.avgRating.toFixed(1)}
            </span>
          ) : null}
        </p>
      </Link>
    </li>
  );
}

export function RecipeRow({
  title,
  recipes,
  emptyHint,
  authors,
  selectedAuthorId,
}: {
  title: string;
  recipes: RecipeCard[];
  emptyHint?: string;
  /** When provided, renders an author picker beside the row title. */
  authors?: Author[];
  selectedAuthorId?: string | null;
}) {
  const router = useRouter();

  if (recipes.length === 0 && !emptyHint) return null;

  return (
    <section className="mb-8">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {authors && authors.length > 0 ? (
          <select
            value={selectedAuthorId ?? ""}
            onChange={(e) => router.push(`/?author=${e.target.value}`)}
            className="rounded-lg border border-black/15 bg-canvas px-2.5 py-1 text-sm outline-none focus:border-amber-500 dark:border-white/15"
          >
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.display_name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {recipes.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyHint}</p>
      ) : (
        <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {recipes.map((r) => (
            <Card key={r.id} recipe={r} />
          ))}
        </ul>
      )}
    </section>
  );
}
