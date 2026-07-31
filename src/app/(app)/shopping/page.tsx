import { PageHeader } from "@/components/page-header";
import { addDays, fromISODate, startOfWeek, toISODate } from "@/lib/dates";
import { listPantryItems } from "@/lib/queries/recipes";
import { listPlannedMealsWithIngredients } from "@/lib/queries/planner";
import { resolveIngredientAliases } from "@/lib/queries/aliases";
import { canonicalKey } from "@/lib/fridge";
import { buildShoppingList, flattenPlannedMeals } from "@/lib/shopping";
import { ShoppingList } from "./shopping-list";

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;

  const weekStart =
    start && /^\d{4}-\d{2}-\d{2}$/.test(start)
      ? startOfWeek(fromISODate(start))
      : startOfWeek(new Date());

  const from = toISODate(weekStart);
  const to = toISODate(addDays(weekStart, 6));

  const [planned, pantry] = await Promise.all([
    listPlannedMealsWithIngredients(from, to),
    listPantryItems(),
  ]);

  const ingredients = flattenPlannedMeals(planned);
  // Merge names for the same product ("scallions" + "green onions") so their
  // quantities add up into one line instead of listing separately.
  const aliases = await resolveIngredientAliases(
    ingredients.map((i) => canonicalKey(i.item)),
  );
  const { toBuy, covered } = buildShoppingList(ingredients, pantry, aliases);

  return (
    <>
      <PageHeader
        title="Shopping List"
        description="Generated from your planned meals, minus pantry staples."
        info={
          <>
            Built from every meal planned for the week, scaled to the portions
            you set, with quantities added together. Names for the same product
            are merged, so &ldquo;scallions&rdquo; from one recipe and
            &ldquo;green onions&rdquo; from another become one line. Anything
            in your <strong>pantry</strong> is left off unless the week would
            run you out. Check items off as you shop — ticks are remembered per
            week on this device.
          </>
        }
      />
      <ShoppingList
        weekStart={from}
        mealCount={planned.length}
        toBuy={toBuy}
        covered={covered}
      />
    </>
  );
}
