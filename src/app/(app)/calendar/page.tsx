import { PageHeader } from "@/components/page-header";
import { calendarGrid, toISODate } from "@/lib/dates";
import { listPlannedMeals, listRecipeOptions } from "@/lib/queries/planner";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;

  const now = new Date();
  let year = now.getFullYear();
  let monthIdx = now.getMonth();
  const parsed = month?.match(/^(\d{4})-(\d{2})$/);
  if (parsed) {
    year = Number(parsed[1]);
    monthIdx = Number(parsed[2]) - 1;
  }

  // Fetch the visible grid range (includes leading/trailing days).
  const weeks = calendarGrid(year, monthIdx);
  const from = toISODate(weeks[0][0]);
  const to = toISODate(weeks[weeks.length - 1][6]);

  const [meals, recipes] = await Promise.all([
    listPlannedMeals(from, to),
    listRecipeOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Plan meals across the month — hover a day to add."
        info={
          <>
            Hover a day and hit <strong>+</strong> to plan a meal. Portions
            spread across consecutive days by default, so setting a dinner to 5
            portions on Sunday fills Sunday through Thursday — one portion a
            day, the way a batch actually gets eaten. Uncheck &ldquo;spread
            across days&rdquo; to stack them all on one date instead. Hover any
            day with meals to see the full names, that day&apos;s macros, and links
            to each recipe.
          </>
        }
      />
      <CalendarView
        year={year}
        monthIdx={monthIdx}
        meals={meals}
        recipes={recipes}
      />
    </>
  );
}
