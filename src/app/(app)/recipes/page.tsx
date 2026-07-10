import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, ComingSoon } from "@/components/page-header";

export default function RecipesPage() {
  return (
    <>
      <PageHeader
        title="Recipes"
        description="Your personal recipe box."
        action={
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add recipe
          </Link>
        }
      />
      <ComingSoon note="Recipe list coming in Phase 4 — once the database schema is live, your saved recipes will show up here." />
    </>
  );
}
