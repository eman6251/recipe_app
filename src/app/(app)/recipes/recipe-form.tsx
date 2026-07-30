"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { parseQuantity } from "@/lib/quantity";
import type { RecipePayload } from "./actions";
import type { RecipeWithIngredients } from "@/lib/types";

type IngredientRow = {
  key: number;
  quantity: string;
  unit: string;
  item: string;
  note: string;
  group_name: string | null;
  grams: string; // editable text; parsed on submit
  fdc_id: number | null;
};

type Props = {
  initial?: RecipeWithIngredients;
  onSubmit: (payload: RecipePayload) => Promise<{ error: string } | void>;
  submitLabel: string;
};

let nextKey = 0;
const newRow = (): IngredientRow => ({
  key: nextKey++,
  quantity: "",
  unit: "",
  item: "",
  note: "",
  group_name: null,
  grams: "",
  fdc_id: null,
});

function rowsFromInitial(initial?: RecipeWithIngredients): IngredientRow[] {
  if (!initial || initial.recipe_ingredients.length === 0) {
    return [newRow(), newRow(), newRow()];
  }
  return initial.recipe_ingredients.map((ing) => ({
    key: nextKey++,
    quantity: ing.quantity != null ? String(ing.quantity) : "",
    unit: ing.unit ?? "",
    item: ing.item,
    note: ing.note ?? "",
    group_name: ing.group_name,
    grams: ing.grams != null ? String(ing.grams) : "",
    fdc_id: ing.fdc_id,
  }));
}

const inputClass =
  "rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15";

const cardClass =
  "flex flex-col gap-6 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10";

export function RecipeForm({ initial, onSubmit, submitLabel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url ?? "");
  const [sourceNote, setSourceNote] = useState(initial?.source_note ?? "");
  const [servings, setServings] = useState(String(initial?.servings ?? 2));
  const [prepMinutes, setPrepMinutes] = useState(
    initial?.prep_minutes != null ? String(initial.prep_minutes) : "",
  );
  const [cookMinutes, setCookMinutes] = useState(
    initial?.cook_minutes != null ? String(initial.cook_minutes) : "",
  );
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [instructions, setInstructions] = useState(
    initial?.instructions.join("\n") ?? "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [rows, setRows] = useState<IngredientRow[]>(() =>
    rowsFromInitial(initial),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const updateRow = (key: number, patch: Partial<IngredientRow>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: number) => {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate quantities up front so "1/2" typos never silently vanish.
    for (const r of rows) {
      if (r.item.trim() && r.quantity.trim() && parseQuantity(r.quantity) == null) {
        setError(
          `Couldn't read the quantity "${r.quantity}" for "${r.item}". Use formats like 2, 1.5, 1/2, or 1 1/2.`,
        );
        return;
      }
    }

    const payload: RecipePayload = {
      title: title.trim(),
      description: description.trim() || null,
      source_url: sourceUrl.trim() || null,
      source_note: sourceNote.trim() || null,
      servings: Number(servings) || 1,
      prep_minutes: prepMinutes ? Number(prepMinutes) : null,
      cook_minutes: cookMinutes ? Number(cookMinutes) : null,
      instructions: instructions
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      notes: notes.trim() || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ingredients: rows.map((r) => {
        const grams = r.grams.trim() ? Number(r.grams) : null;
        return {
          group_name: r.group_name,
          quantity: parseQuantity(r.quantity),
          unit: r.unit.trim() || null,
          item: r.item,
          note: r.note.trim() || null,
          grams: grams != null && Number.isFinite(grams) && grams > 0 ? grams : null,
          fdc_id: r.fdc_id,
        };
      }),
    };

    if (!payload.title) {
      setError("Give it a title.");
      return;
    }

    startTransition(async () => {
      const result = await onSubmit(payload);
      // On success the action redirects, so we only ever see errors here.
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6">
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <section className={cardClass}>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Honey garlic chicken thighs"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          Description{" "}
          <span className="font-normal text-zinc-400">(optional)</span>
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Source URL</span>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            type="url"
            placeholder="https://www.instagram.com/reel/…"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Source note</span>
          <input
            value={sourceNote}
            onChange={(e) => setSourceNote(e.target.value)}
            placeholder="@creator on IG"
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Servings</span>
          <input
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            type="number"
            min="0.5"
            step="0.5"
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Prep (min)</span>
          <input
            value={prepMinutes}
            onChange={(e) => setPrepMinutes(e.target.value)}
            type="number"
            min="0"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Cook (min)</span>
          <input
            value={cookMinutes}
            onChange={(e) => setCookMinutes(e.target.value)}
            type="number"
            min="0"
            className={inputClass}
          />
        </label>
      </div>
      </section>

      {/* Ingredients */}
      <section className={cardClass}>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Ingredients</legend>
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[70px_90px_1fr_auto] gap-2 md:grid-cols-[70px_90px_2fr_1fr_80px_auto]"
            >
              <input
                value={row.quantity}
                onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                placeholder="1/2"
                inputMode="decimal"
                aria-label="Quantity"
                className={inputClass}
              />
              <input
                value={row.unit}
                onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                placeholder="tbsp"
                aria-label="Unit"
                className={inputClass}
              />
              <input
                value={row.item}
                onChange={(e) => updateRow(row.key, { item: e.target.value })}
                placeholder="olive oil"
                aria-label="Ingredient"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                aria-label="Remove ingredient"
                className="flex items-center justify-center rounded-lg px-2 text-zinc-400 transition-colors hover:bg-black/5 hover:text-red-600 dark:hover:bg-white/5 md:order-last"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Note + grams wrap to their own line on narrow screens */}
              <input
                value={row.note}
                onChange={(e) => updateRow(row.key, { note: e.target.value })}
                placeholder="note — minced, substitutions…"
                aria-label="Note"
                className={`${inputClass} col-span-3 md:col-span-1`}
              />
              <input
                value={row.grams}
                onChange={(e) => updateRow(row.key, { grams: e.target.value })}
                placeholder="g"
                inputMode="decimal"
                aria-label="Grams (for macros)"
                title="Weight in grams — used for macro computation"
                className={`${inputClass} md:order-none`}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, newRow()])}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
        >
          <Plus className="h-4 w-4" />
          Add ingredient
        </button>
      </fieldset>
      </section>

      <section className={cardClass}>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          Instructions{" "}
          <span className="font-normal text-zinc-400">(one step per line)</span>
        </span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={8}
          placeholder={
            "Pat chicken dry and season.\nSear skin-side down 6–7 min.\n…"
          }
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Tags{" "}
            <span className="font-normal text-zinc-400">(comma-separated)</span>
          </span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="chicken, high-protein, weeknight"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Notes <span className="font-normal text-zinc-400">(optional)</span>
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Double the sauce next time"
            className={inputClass}
          />
        </label>
      </div>
      </section>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
