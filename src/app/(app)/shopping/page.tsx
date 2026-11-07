import { PageHeader } from "@/components/page-header";
import { addDays, toISODate } from "@/lib/dates";
import { listPantryItems } from "@/lib/queries/recipes";
import { listPlannedMealsWithIngredients } from "@/lib/queries/planner";
import { resolveIngredientAliases } from "@/lib/queries/aliases";
import { canonicalKey } from "@/lib/fridge";
import { buildShoppingList, flattenPlannedMeals } from "@/lib/shopping";
import { ShoppingList } from "./shopping-list";

export default async function ShoppingPage() {
  const now = new Date();
  const today = toISODate(now);

  /*
   * A window rather than everything ever planned: the query has to be bounded
   * somewhere, and sixty days each way is far past how far ahead anyone
   * plans dinners. The back half matters too — a batch planned for last week
   * and never cooked is still food you haven't bought.
   */
  const [planned, pantry] = await Promise.all([
    listPlannedMealsWithIngredients(
      toISODate(addDays(now, -60)),
      toISODate(addDays(now, 60)),
    ),
    listPantryItems(),
  ]);

  const { ingredients, cookedCount, stale, choices } = flattenPlannedMeals(
    planned,
    today,
  );
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
            Everything you&apos;ve planned and not yet cooked, in one list —
            not split by week, because a shop is a trip and a trip doesn&apos;t
            respect Sunday. Ticking a recipe as cooked, on the calendar or in
            This Week, is what takes it off here. More portions than the
            recipe makes buys more; <em>fewer</em> still buys the whole recipe,
            since you can&apos;t cook a quarter of a stew — though you can
            switch any of those to the smaller amount where the recipe
            genuinely divides. Names for the same product are merged, so
            &ldquo;scallions&rdquo; from one recipe and &ldquo;green
            onions&rdquo; from another become one line. Anything in your{" "}
            <strong>pantry</strong> is left off unless what you&apos;ve
            planned would run you out. Check items off as you shop — ticks stay
            on this device until you reset them.
          </>
        }
      />
      <ShoppingList
        choices={choices}
        toBuy={toBuy}
        covered={covered}
        cookedCount={cookedCount}
        stale={stale}
      />
    </>
  );
}
