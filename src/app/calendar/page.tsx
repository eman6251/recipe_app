import { PageHeader, ComingSoon } from "@/components/page-header";

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        title="Calendar"
        description="Plan your meals across the month."
      />
      <ComingSoon note="The monthly meal-planning calendar arrives in Phase 6, once recipes and the meal-plan schema exist." />
    </>
  );
}
