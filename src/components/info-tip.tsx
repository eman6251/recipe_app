"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

/**
 * Small "what is this?" affordance for a page description.
 *
 * Click rather than hover: these explain mechanics worth reading properly,
 * and a tooltip that vanishes when the pointer drifts is no use for that —
 * nor is hover available on a phone.
 */
export function InfoTip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative ml-1.5 inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="How this page works"
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
          open
            ? "text-amber-600 dark:text-amber-400"
            : "text-zinc-400 hover:text-amber-600 dark:text-zinc-500 dark:hover:text-amber-400"
        }`}
      >
        <Info className="h-4 w-4" />
      </button>

      {open ? (
        <span className="absolute left-0 top-full z-40 mt-2 block w-[min(88vw,26rem)] rounded-xl border border-black/10 bg-surface p-4 text-sm leading-relaxed font-normal text-zinc-600 shadow-xl dark:border-white/15 dark:text-zinc-300">
          {children}
        </span>
      ) : null}
    </span>
  );
}
