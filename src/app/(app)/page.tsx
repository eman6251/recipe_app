import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  UtensilsCrossed,
  ShoppingCart,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getHomeData } from "@/lib/queries/discover";
import { RecipeRow } from "./recipe-row";

const TILES = [
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/week", label: "This Week", icon: UtensilsCrossed },
  { href: "/shopping", label: "Shopping", icon: ShoppingCart },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ author?: string }>;
}) {
  const { author } = await searchParams;
  const data = await getHomeData(author);

  const hasAnything =
    data.recentlyViewed.length > 0 ||
    data.recommended.length > 0 ||
    data.newlyShared.length > 0 ||
    data.byAuthor.length > 0;

  return (
    <>
      <PageHeader
        title="Welcome back"
        description="Your kitchen command center."
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

      {/* Quick links */}
      <nav className="mb-8 flex flex-wrap gap-2">
        {TILES.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-surface px-3.5 py-2 text-sm font-medium transition-colors hover:border-emerald-500/50 dark:border-white/10"
          >
            <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {label}
          </Link>
        ))}
      </nav>

      {!hasAnything ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-surface/60 p-10 text-center dark:border-white/15">
          <p className="font-medium">Nothing to show yet</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Add a few recipes and they&apos;ll start showing up here.
          </p>
        </div>
      ) : null}

      <RecipeRow title="Recently viewed" recipes={data.recentlyViewed} />

      <RecipeRow
        title="Recommended for you"
        recipes={data.recommended}
        emptyHint={
          data.cookedCount === 0
            ? "Cook a few meals (check them off in This Week) or rate some recipes, and suggestions will show up here."
            : undefined
        }
      />

      <RecipeRow title="New recipes" recipes={data.newlyShared} />

      <RecipeRow
        title="Recipes by"
        recipes={data.byAuthor}
        authors={data.authors}
        selectedAuthorId={data.selectedAuthorId}
        emptyHint="No recipes from this cook yet."
      />
    </>
  );
}
