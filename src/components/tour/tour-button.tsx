"use client";

import { Compass } from "lucide-react";
import { useTour } from "./tour-provider";

export function TourButton() {
  const { start } = useTour();

  return (
    <button
      type="button"
      data-tour="tour-button"
      onClick={start}
      className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 px-3 py-2 text-sm font-medium transition-colors hover:border-amber-400/80 hover:bg-amber-400/10"
    >
      <Compass className="h-4 w-4" />
      Take the walkthrough
    </button>
  );
}
