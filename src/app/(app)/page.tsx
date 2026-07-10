import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  UtensilsCrossed,
  ShoppingCart,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

type Tile = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const TILES: Tile[] = [
  {
    href: "/recipes",
    label: "Recipes",
    description: "Browse and cook from your recipe box",
    icon: BookOpen,
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "Plan meals across the month",
    icon: CalendarDays,
  },
  {
    href: "/week",
    label: "This Week",
    description: "Meal prep plan + macro breakdown",
    icon: UtensilsCrossed,
  },
  {
    href: "/shopping",
    label: "Shopping",
    description: "Grocery list from your planned meals",
    icon: ShoppingCart,
  },
];

export default function Home() {
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TILES.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 rounded-xl border border-black/10 bg-surface p-5 transition-colors hover:border-emerald-500/50 dark:border-white/10"
          >
            <span className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-medium">{label}</span>
              <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
