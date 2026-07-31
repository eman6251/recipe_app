import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { INGREDIENT_GROUPS, isPrimaryIngredient } from "@/lib/ingredients";
import { listBrowseRecipes } from "@/lib/queries/browse";

export default async function IngredientsPage() {
  const recipes = await listBrowseRecipes();

  return (
    <>
      <PageHeader
        title="Ingredients"
        description="Browse by what a recipe is actually built around."
        info={
          <>
            These list recipes an ingredient is central to, not every recipe
            that merely contains it — a chili with a spoon of bouillon
            won&apos;t show up under Chicken. A recipe qualifies when the
            ingredient is named in its title, or is one of the heaviest
            ingredients by weight, so results improve as recipes get gram
            estimates from the importer or the macro calculation.
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {INGREDIENT_GROUPS.map((group) => (
          <section
            key={group.id}
            className="rounded-xl border border-black/10 bg-surface p-5 dark:border-white/10"
          >
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {group.label}
            </h2>
            <ul className="flex flex-col gap-2">
              {group.items.map((item) => {
                const count = recipes.filter((r) =>
                  isPrimaryIngredient(r, item.aliases, item.excludes),
                ).length;
                return (
                  <li key={item.slug}>
                    <Link
                      href={`/ingredients/${item.slug}`}
                      className="flex items-baseline justify-between gap-2 text-sm transition-colors hover:text-amber-600 dark:hover:text-amber-400"
                    >
                      <span>{item.label}</span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {count}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
