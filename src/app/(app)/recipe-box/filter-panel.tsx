"use client";

import { useEffect, useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import { FILTER_GROUPS } from "@/lib/filters";

export function FilterPanel({
  open,
  onOpenChange,
  selected,
  onToggle,
  onClear,
  counts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  counts: Map<string, number>;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click-outside and Escape both close, as with any dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
          selected.size > 0
            ? "border-amber-400 bg-amber-400 text-zinc-950"
            : "border-black/10 bg-surface text-zinc-600 hover:bg-black/5 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/10"
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {selected.size > 0 ? (
          <span className="rounded-full bg-zinc-950/15 px-1.5 text-xs">
            {selected.size}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-[min(92vw,42rem)] rounded-xl border border-black/10 bg-surface shadow-xl dark:border-white/15">
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-3 dark:border-white/10">
            <h2 className="font-semibold">Filters</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Close
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {FILTER_GROUPS.map((group) => (
                <section key={group.id}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {group.label}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {group.options.map((option) => {
                      const count = counts.get(option.id) ?? 0;
                      const checked = selected.has(option.id);
                      // Nothing matches, so offering it would be a dead end —
                      // but keep it visible so the vocabulary is discoverable.
                      const disabled = count === 0 && !checked;
                      return (
                        <li key={option.id}>
                          <label
                            className={`flex items-center gap-2.5 text-sm ${
                              disabled
                                ? "cursor-not-allowed text-zinc-400 dark:text-zinc-600"
                                : "cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => onToggle(option.id)}
                              className="h-4 w-4 accent-amber-500"
                            />
                            <span className="font-medium">{option.label}</span>
                            <span className="text-zinc-400 dark:text-zinc-500">
                              ({count})
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-black/10 px-5 py-3 dark:border-white/10">
            <button
              onClick={onClear}
              disabled={selected.size === 0}
              className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/5"
            >
              Clear all filters
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full bg-amber-400 px-6 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
