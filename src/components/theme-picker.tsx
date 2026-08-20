"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_COOKIE, themeAttribute, type ThemeChoice } from "@/lib/theme";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/**
 * Applies the change in the page immediately and writes the cookie for next
 * time, rather than posting to the server and waiting for a re-render — a
 * theme switch that takes a round trip feels broken.
 */
export function ThemePicker({ initial }: { initial: ThemeChoice }) {
  const [choice, setChoice] = useState<ThemeChoice>(initial);

  // The document is outside React's tree, so touching it belongs in an effect
  // rather than the click handler. Runs once on mount too, where it just
  // re-states what the server already stamped.
  useEffect(() => {
    const attribute = themeAttribute(choice);
    if (attribute) document.documentElement.dataset.theme = attribute;
    else delete document.documentElement.dataset.theme;

    // A year, site-wide. Lax is enough — nothing here is worth forging.
    document.cookie = `${THEME_COOKIE}=${choice}; path=/; max-age=31536000; samesite=lax`;
  }, [choice]);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex gap-1 rounded-lg border border-black/10 p-0.5 dark:border-white/10"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          onClick={() => setChoice(value)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            choice === value
              ? "bg-amber-400 text-zinc-950"
              : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
