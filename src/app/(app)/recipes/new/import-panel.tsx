"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { parseCaption, type ParsedRecipeDraft } from "./actions";

const inputClass =
  "rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15";

export function ImportPanel({
  onParsed,
}: {
  onParsed: (draft: ParsedRecipeDraft) => void;
}) {
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleParse = () => {
    setError(null);
    startTransition(async () => {
      const result = await parseCaption(caption);
      if ("error" in result) {
        setError(result.error);
      } else {
        onParsed(result.draft);
      }
    });
  };

  return (
    <section className="mb-6 flex flex-col gap-3 rounded-xl border border-emerald-600/30 bg-surface p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-sm font-semibold">Import with AI</h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Paste the caption from a TikTok/Instagram recipe (or any recipe text) and
        Claude will fill in the form below for you to review.
      </p>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={5}
        placeholder={"HIGH PROTEIN honey garlic chicken 🔥\n\nIngredients:\n- 2 lbs chicken thighs\n- 3 tbsp honey\n…"}
        className={inputClass}
        disabled={pending}
      />
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div>
        <button
          type="button"
          onClick={handleParse}
          disabled={pending || caption.trim().length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {pending ? "Parsing…" : "Parse with Claude"}
        </button>
      </div>
    </section>
  );
}
