import { PageHeader, ComingSoon } from "@/components/page-header";

export default function ShoppingPage() {
  return (
    <>
      <PageHeader
        title="Shopping List"
        description="Generated from your planned meals, minus pantry staples."
      />
      <ComingSoon note="The smart shopping list — aggregating ingredients across the week and subtracting pantry staples you already have — arrives in Phase 7." />
    </>
  );
}
