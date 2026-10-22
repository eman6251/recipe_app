import { PageHeader } from "@/components/page-header";
import { addDays, fromISODate, startOfWeek, toISODate } from "@/lib/dates";
import { listPlannedMeals, listRecipeOptions } from "@/lib/queries/planner";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
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

  const supabase = await createClient();
  const user = await getCurrentUser();

  const [meals, recipes, { data: profile }] = await Promise.all([
    listPlannedMeals(from, to),
    listRecipeOptions(),
    supabase
      .from("profiles")
      .select("daily_calorie_goal")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
  ]);

  return (
    <>
      <PageHeader
        title="This Week"
        description="Your meal-prep plan and macro breakdown."
        info={
          <>
            The <strong>prep list</strong> at the top has one row per recipe,
            however many days it&apos;s spread across — you cook a batch once, so
            you check it off once. Macros come from each recipe&apos;s computed
            per-serving values times the portions planned; the daily average
            divides by days that actually have meals, so a half-planned week
            isn&apos;t reported as starvation. Recipes without computed macros are
            called out rather than silently counted as zero. Macros are
            estimates and this part of the app is still being refined, so treat
            weekly totals as a guide. Set a{" "}
            <strong>daily calorie goal</strong> in your profile and the week&apos;s
            prepped calories are shown against seven days of it, with whatever
            is left over — the room you have for snacks, drinks and meals out.
          </>
        }
      />
      <WeekView
        weekStart={from}
        meals={meals}
        recipes={recipes}
        dailyCalorieGoal={profile?.daily_calorie_goal ?? null}
      />
    </>
  );
}
