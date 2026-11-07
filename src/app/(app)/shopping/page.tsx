import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
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
   * Forward sixty days, which is well past how far ahead anyone plans
   * dinners. The fortnight of lookback isn't for shopping — past cooks are
   * dropped — but for batching: a run that began last Thursday has to be seen
   * whole to know it began then, and therefore that it's behind us.
   */
  const supabase = await createClient();

  const [planned, pantry, { data: checkRows }] = await Promise.all([
    listPlannedMealsWithIngredients(
      toISODate(addDays(now, -14)),
      toISODate(addDays(now, 60)),
    ),
    listPantryItems(),
    // Tolerant on purpose: a tick that can't be read means an unticked list,
    // which is a slower shop. Failing the whole page over it would be worse.
    supabase.from("shopping_checks").select("item_key"),
  ]);

  const { ingredients, skipped, choices } = flattenPlannedMeals(planned, today);
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
            respect Sunday. A recipe drops off once you tick it as cooked, and
            in any case once its cook day has passed. More portions than the
            recipe makes buys more; <em>fewer</em> still buys the whole recipe,
            since you can&apos;t cook a quarter of a stew — though you can
            switch any of those to the smaller amount where the recipe
            genuinely divides. Names for the same product are merged, so
            &ldquo;scallions&rdquo; from one recipe and &ldquo;green
            onions&rdquo; from another become one line. Anything in your{" "}
            <strong>pantry</strong> is left off unless what you&apos;ve
            planned would run you out. Check items off as you shop — ticks are saved to
            your account, so what you cross off on a laptop is already crossed
            off on your phone.
          </>
        }
      />
      <ShoppingList
        initialChecked={(checkRows ?? []).map((r) => r.item_key as string)}
        choices={choices}
        toBuy={toBuy}
        covered={covered}
        skipped={skipped}
      />
    </>
  );
}
