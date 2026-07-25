import { PageHeader } from "@/components/page-header";
import { addDays, fromISODate, startOfWeek, toISODate } from "@/lib/dates";
import { listPlannedMeals, listRecipeOptions } from "@/lib/queries/planner";
import { WeekView } from "./week-view";

export default async function WeekPage({
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

  const [meals, recipes] = await Promise.all([
    listPlannedMeals(from, to),
    listRecipeOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="This Week"
        description="Your meal-prep plan and macro breakdown."
      />
      <WeekView weekStart={from} meals={meals} recipes={recipes} />
    </>
  );
}
