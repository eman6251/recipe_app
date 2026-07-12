"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import type { PantryItem } from "@/lib/types";
import { deletePantryItem } from "./actions";

export function PantryList({ items }: { items: PantryItem[] }) {
  const [, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No staples yet — add things you always keep on hand: olive oil, salt,
        garlic, rice, flour…
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="group inline-flex items-center gap-1.5 rounded-full bg-emerald-50 py-1 pl-3 pr-1.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
        >
          {item.name}
          <button
            onClick={() => startTransition(() => deletePantryItem(item.id))}
            aria-label={`Remove ${item.name}`}
            className="rounded-full p-0.5 text-emerald-600/60 transition-colors hover:bg-emerald-600/15 hover:text-emerald-800 dark:text-emerald-400/60 dark:hover:text-emerald-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
