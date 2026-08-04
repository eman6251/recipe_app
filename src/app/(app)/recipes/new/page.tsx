"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import type { RecipeWithIngredients } from "@/lib/types";
import { RecipeForm } from "../recipe-form";
import { createRecipe } from "../actions";
import { ImportPanel } from "./import-panel";
import type { ParsedRecipeDraft } from "./actions";

/** Shape a parsed AI draft like a stored recipe so RecipeForm can prefill. */
function draftToInitial(
  draft: ParsedRecipeDraft,
  sourceUrl?: string,
): RecipeWithIngredients {
  return {
    id: "",
    user_id: "",
    title: draft.title,
    description: draft.description,
    source_url: sourceUrl ?? null,
    source_note: draft.source_note,
    servings: draft.servings || 1,
    prep_minutes: draft.prep_minutes != null ? Math.round(draft.prep_minutes) : null,
    cook_minutes: draft.cook_minutes != null ? Math.round(draft.cook_minutes) : null,
    instructions: draft.instructions,
    notes: draft.notes,
    tags: draft.tags,
    image_url: null,
    macros_per_serving: null,
    is_public: false,
    created_at: "",
    updated_at: "",
    recipe_ingredients: draft.ingredients.map((ing, i) => ({
      id: `draft-${i}`,
      recipe_id: "",
      position: i,
      group_name: ing.group_name,
      quantity: ing.quantity,
      unit: ing.unit,
      item: ing.item,
      note: ing.note,
      grams: ing.grams,
      fdc_id: null,
      macros: null,
      created_at: "",
    })),
  };
}

export default function NewRecipePage() {
  const [draft, setDraft] = useState<RecipeWithIngredients | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);

  return (
    <>
      <PageHeader
        title="Add a recipe"
        description="Paste a caption to auto-fill, or enter it manually."
        info={
          <>
            Paste the caption from a TikTok or Instagram recipe and Claude
            fills in the form below — ingredients split into quantity, unit and
            item, steps, tags, and an estimated weight in grams for each
            ingredient. Those gram estimates power the macro calculation and
            the grams/ounces toggle later, so they&apos;re worth a glance.
            Nothing saves until you review it and hit save, and the manual form
            works fine on its own.
          </>
        }
      />
      <ImportPanel
        onParsed={(parsed, sourceUrl) => {
          setDraft(draftToInitial(parsed, sourceUrl));
          setDraftVersion((v) => v + 1);
        }}
      />
      {/* key remounts the form when a new draft arrives, replacing its state */}
      <RecipeForm
        key={draftVersion}
        initial={draft ?? undefined}
        onSubmit={createRecipe}
        submitLabel="Save recipe"
      />
    </>
  );
}
