"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteRecipe } from "../actions";

export function DeleteRecipeButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (!window.confirm(`Delete “${title}”? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteRecipe(id);
      if (result?.error) window.alert(`Delete failed: ${result.error}`);
    });
  };

  return (
    <button
      onClick={onDelete}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-white/10 dark:text-red-400 dark:hover:bg-red-950/50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
