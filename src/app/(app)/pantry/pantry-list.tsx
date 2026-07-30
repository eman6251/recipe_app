"use client";

import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { UNCATEGORIZED_LABEL } from "@/lib/pantry";
import type { PantryCategory, PantryItem } from "@/lib/types";
import {
  deletePantryCategory,
  deletePantryItem,
  updatePantryItem,
} from "./actions";

const numClass =
  "w-20 rounded-md border border-black/15 bg-canvas px-2 py-1 text-sm tabular-nums outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15";

/** Grams field that saves on blur (or Enter) — the field edited most often. */
function GramsField({
  itemId,
  field,
  value,
  label,
}: {
  itemId: string;
  field: "on_hand_g" | "restock_below_g";
  value: number | null;
  label: string;
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  const [pending, startTransition] = useTransition();

  const commit = () => {
    const trimmed = draft.trim();
    const parsed = trimmed ? Number(trimmed) : null;
    const next =
      parsed != null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    if (next === value) return;
    startTransition(() => updatePantryItem(itemId, { [field]: next }));
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      inputMode="decimal"
      placeholder="—"
      aria-label={label}
      title={label}
      className={`${numClass} ${pending ? "opacity-50" : ""}`}
    />
  );
}

export function PantryList({
  items,
  categories,
}: {
  items: PantryItem[];
  categories: PantryCategory[];
}) {
  const [, startTransition] = useTransition();

  if (items.length === 0 && categories.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No staples yet — add things you always keep on hand: olive oil, salt,
        rice, soy sauce…
      </p>
    );
  }

  const byCategory = new Map<string, PantryItem[]>();
  for (const item of items) {
    const key = item.category_id ?? "";
    const list = byCategory.get(key) ?? [];
    list.push(item);
    byCategory.set(key, list);
  }

  const uncategorized = byCategory.get("") ?? [];
  const groups: {
    id: string | null;
    name: string;
    items: PantryItem[];
  }[] = [
    ...categories.map((c) => ({
      id: c.id,
      name: c.name,
      items: byCategory.get(c.id) ?? [],
    })),
    ...(uncategorized.length > 0
      ? [{ id: null, name: UNCATEGORIZED_LABEL, items: uncategorized }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.id ?? "none"}>
          <div className="mb-2 flex items-center gap-2 border-b border-black/10 pb-1.5 dark:border-white/10">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {group.name}
            </h3>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {group.items.length}
            </span>
            {group.id ? (
              <button
                onClick={() =>
                  startTransition(() => deletePantryCategory(group.id!))
                }
                aria-label={`Delete category ${group.name}`}
                title="Delete category (its staples move to Uncategorized)"
                className="ml-auto rounded p-1 text-zinc-400 transition-colors hover:bg-black/5 hover:text-red-600 dark:hover:bg-white/5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {group.items.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Nothing here yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 border-b border-black/5 py-1.5 last:border-b-0 dark:border-white/5"
                >
                  <span className="flex-1 truncate text-sm">{item.name}</span>

                  <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="hidden sm:inline">have</span>
                    <GramsField
                      itemId={item.id}
                      field="on_hand_g"
                      value={item.on_hand_g}
                      label={`Grams of ${item.name} on hand`}
                    />
                    g
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="hidden sm:inline">restock below</span>
                    <span className="sm:hidden">min</span>
                    <GramsField
                      itemId={item.id}
                      field="restock_below_g"
                      value={item.restock_below_g}
                      label={`Restock ${item.name} when below this many grams`}
                    />
                    g
                  </label>

                  <button
                    onClick={() =>
                      startTransition(() => deletePantryItem(item.id))
                    }
                    aria-label={`Remove ${item.name}`}
                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-black/5 hover:text-red-600 dark:hover:bg-white/5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
