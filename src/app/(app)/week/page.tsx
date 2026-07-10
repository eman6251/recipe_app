import { PageHeader, ComingSoon } from "@/components/page-header";

export default function WeekPage() {
  return (
    <>
      <PageHeader
        title="This Week"
        description="Your meal-prep plan and macro breakdown for the week."
      />
      <ComingSoon note="The weekly meal-prep view with per-day and per-week macro totals arrives in Phase 6." />
    </>
  );
}
