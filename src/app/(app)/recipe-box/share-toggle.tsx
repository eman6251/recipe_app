"use client";

import { useState, useTransition } from "react";
import { Globe, Lock } from "lucide-react";
import { setRecipeShared } from "@/app/(app)/recipes/[id]/social-actions";

/**
 * Share/private toggle on a recipe card, so a batch of recipes can be shared
 * without opening each one.
 *
 * Rendered as a sibling of the card's link rather than inside it — a button
 * nested in an anchor is invalid, and swallowing the click to stop navigation
 * is fragile.
 */
export function ShareToggle({
  recipeId,
  isPublic,
}: {
  recipeId: string;
  isPublic: boolean;
}) {
  const [shared, setShared] = useState(isPublic);
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        const next = !shared;
        setShared(next); // optimistic: the whole point is rapid toggling
        startTransition(async () => {
          const result = await setRecipeShared(recipeId, next);
          if (result?.error) setShared(!next);
        });
      }}
      disabled={pending}
      aria-pressed={shared}
      title={
        shared
          ? "Shared — anyone using Skillet can find this. Click to make private."
          : "Private — only you can see this. Click to share."
      }
      className={`absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium backdrop-blur transition-colors disabled:opacity-60 ${
        shared
          ? "bg-amber-400/90 text-zinc-950 hover:bg-amber-300"
          : "bg-black/50 text-white hover:bg-black/70"
      }`}
    >
      {shared ? (
        <>
          <Globe className="h-3 w-3" /> Shared
        </>
      ) : (
        <>
          <Lock className="h-3 w-3" /> Private
        </>
      )}
    </button>
  );
}
