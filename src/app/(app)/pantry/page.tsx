import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { PantryItem } from "@/lib/types";
import { addPantryItem } from "./actions";
import { PantryList } from "./pantry-list";

export default async function PantryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pantry_items")
    .select("*")
    .order("name");

  if (error) throw new Error(`Failed to load pantry: ${error.message}`);
  const items = (data ?? []) as PantryItem[];

  return (
    <>
      <PageHeader
        title="Pantry staples"
        description="Things you always have on hand. “What can I make?” and the shopping list both assume these are stocked."
      />

      <section className="flex flex-col gap-5 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10">
        <form action={addPantryItem} className="flex gap-2">
          <input
            name="name"
            required
            placeholder="olive oil"
            autoComplete="off"
            className="w-full max-w-xs rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>

        <PantryList items={items} />
      </section>
    </>
  );
}
