import { PageHeader } from "@/components/page-header";
import { addDays, fromISODate, startOfWeek, toISODate } from "@/lib/dates";
import { listPantryItems } from "@/lib/queries/recipes";
import { listPlannedMealsWithIngredients } from "@/lib/queries/planner";
import { buildShoppingList, flattenPlannedMeals } from "@/lib/shopping";
import { ShoppingList } from "./shopping-list";

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;

  const monday =
    start && /^\d{4}-\d{2}-\d{2}$/.test(start)
      ? startOfWeek(fromISODate(start))
      : startOfWeek(new Date());

  const from = toISODate(monday);
  const to = toISODate(addDays(monday, 6));

  const [planned, pantry] = await Promise.all([
    listPlannedMealsWithIngredients(from, to),
    listPantryItems(),
  ]);

  const ingredients = flattenPlannedMeals(planned);
  const { toBuy, covered } = buildShoppingList(ingredients, pantry);

  return (
    <>
      <PageHeader
        title="Shopping List"
        description="Generated from your planned meals, minus pantry staples."
      />
      <ShoppingList
        monday={from}
        mealCount={planned.length}
        toBuy={toBuy}
        covered={covered}
      />
    </>
  );
}
