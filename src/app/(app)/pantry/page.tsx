import { FolderPlus, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { listPantryCategories, listPantryItems } from "@/lib/queries/recipes";
import { addPantryCategory, addPantryItem } from "./actions";
import { PantryList } from "./pantry-list";

const inputClass =
  "rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15";

export default async function PantryPage() {
  const [items, categories] = await Promise.all([
    listPantryItems(),
    listPantryCategories(),
  ]);

  return (
    <>
      <PageHeader
        title="Pantry staples"
        description="Things you keep on hand. Weigh what's left and the shopping list will flag a restock before a week runs you out."
      />

      {/* Add a staple */}
      <section className="mb-6 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10">
        <form action={addPantryItem} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <label className="col-span-2 flex flex-col gap-1.5 md:col-span-1">
              <span className="text-sm font-medium">Staple</span>
              <input
                name="name"
                required
                placeholder="cumin"
                autoComplete="off"
                className={inputClass}
              />
            </label>

            <label className="col-span-2 flex flex-col gap-1.5 md:col-span-1">
              <span className="text-sm font-medium">Category</span>
              <select name="category_id" className={inputClass} defaultValue="">
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                On hand <span className="font-normal text-zinc-400">(g, with packaging)</span>
              </span>
              <input
                name="on_hand_g"
                type="number"
                min="0"
                step="any"
                placeholder="120"
                title="Weigh it in its jar or bag — a typical container weight is subtracted automatically. Leave blank to always assume stocked."
                className={inputClass}
              />
            </label>

          </div>

          <div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
            >
              <Plus className="h-4 w-4" />
              Add staple
            </button>
          </div>
        </form>

        <form
          action={addPantryCategory}
          className="mt-4 flex flex-wrap items-end gap-2 border-t border-black/10 pt-4 dark:border-white/10"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">New category</span>
            <input
              name="category_name"
              required
              placeholder="Vinegars"
              autoComplete="off"
              className={`${inputClass} w-56`}
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-black/5 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
          >
            <FolderPlus className="h-4 w-4" />
            Add category
          </button>
        </form>
      </section>

      {/* The staples themselves */}
      <section className="rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10">
        <PantryList items={items} categories={categories} />
      </section>
    </>
  );
}
