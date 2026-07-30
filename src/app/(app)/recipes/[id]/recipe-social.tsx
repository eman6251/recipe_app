"use client";

import { useEffect, useState, useTransition } from "react";
import { Globe, Lock, Star } from "lucide-react";
import { rateRecipe, recordRecipeView, setRecipeShared } from "./social-actions";

export function RecipeSocial({
  recipeId,
  isOwner,
  isPublic,
  myRating,
  avgRating,
  ratingCount,
}: {
  recipeId: string;
  isOwner: boolean;
  isPublic: boolean;
  myRating: number | null;
  avgRating: number | null;
  ratingCount: number;
}) {
  const [rating, setRating] = useState(myRating);
  const [hovered, setHovered] = useState<number | null>(null);
  const [shared, setShared] = useState(isPublic);
  const [, startTransition] = useTransition();

  // Log the visit once per mount so "recently viewed" reflects real opens.
  useEffect(() => {
    void recordRecipeView(recipeId);
  }, [recipeId]);

  const submitRating = (value: number) => {
    setRating(value);
    startTransition(async () => {
      await rateRecipe(recipeId, value);
    });
  };

  const toggleShared = () => {
    const next = !shared;
    setShared(next);
    startTransition(async () => {
      await setRecipeShared(recipeId, next);
    });
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex items-center gap-1.5">
        <div className="flex" onMouseLeave={() => setHovered(null)}>
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = (hovered ?? rating ?? 0) >= star;
            return (
              <button
                key={star}
                onClick={() => submitRating(star)}
                onMouseEnter={() => setHovered(star)}
                aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-4 w-4 ${
                    filled
                      ? "fill-amber-400 text-amber-400"
                      : "text-zinc-300 dark:text-zinc-600"
                  }`}
                />
              </button>
            );
          })}
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {avgRating != null
            ? `${avgRating.toFixed(1)} (${ratingCount})`
            : "Not rated yet"}
        </span>
      </div>

      {isOwner ? (
        <button
          onClick={toggleShared}
          title={
            shared
              ? "Anyone using Skillet can find this recipe"
              : "Only you can see this recipe"
          }
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            shared
              ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
              : "border-black/10 text-zinc-600 hover:bg-black/5 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
          }`}
        >
          {shared ? (
            <>
              <Globe className="h-3.5 w-3.5" /> Shared
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" /> Private
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
