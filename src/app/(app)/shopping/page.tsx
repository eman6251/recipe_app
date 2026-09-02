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

  // Look a fortnight either side so a run of portions can be traced back to
  // the day it was cooked, even when that day sits in the previous week.
  const [planned, pantry] = await Promise.all([
    listPlannedMealsWithIngredients(
      toISODate(addDays(weekStart, -14)),
      toISODate(addDays(weekStart, 20)),
    ),
    listPantryItems(),
  ]);

  const { ingredients, carriedOver, choices } = flattenPlannedMeals(planned, {
    from,
    to,
  });
  const mealCount = planned.filter(
    (m) => m.planned_on >= from && m.planned_on <= to,
  ).length;
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
            Built from what you&apos;ll <strong>cook</strong> this week. More
            portions than the recipe makes buys more; <em>fewer</em> still buys
            the whole recipe, since you can&apos;t cook a quarter of a stew —
            though you can switch any of those to the smaller amount where the
            recipe genuinely divides. A batch counts on the first day
            it appears on the calendar, so meals you cooked last week and are
            still eating don&apos;t get shopped for twice, and a batch cooked
            Saturday is bought in full even though you eat most of it next
            week. Names for the same product are merged, so
            &ldquo;scallions&rdquo; from one recipe and &ldquo;green
            onions&rdquo; from another become one line. Anything in your{" "}
            <strong>pantry</strong> is left off unless the week would run you
            out. Check items off as you shop — ticks are remembered per week on
            this device.
          </>
        }
      />
      <ShoppingList
        weekStart={from}
        choices={choices}
        mealCount={mealCount}
        toBuy={toBuy}
        covered={covered}
        carriedOverCount={carriedOver.length}
      />
    </>
  );
}
