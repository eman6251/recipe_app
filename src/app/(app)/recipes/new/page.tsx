"use client";

import { PageHeader } from "@/components/page-header";
import { RecipeForm } from "../recipe-form";
import { createRecipe } from "../actions";

export default function NewRecipePage() {
  return (
    <>
      <PageHeader
        title="Add a recipe"
        description="Fill it in manually — AI paste-import is coming next."
      />
      <RecipeForm onSubmit={createRecipe} submitLabel="Save recipe" />
    </>
  );
}
