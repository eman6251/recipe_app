import Link from "next/link";
import {
  CalendarDays,
  Refrigerator,
  ShoppingCart,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

/**
 * Previews are drawn rather than screenshotted: a screenshot goes stale the
 * moment the page it depicts changes, and these only need to convey shape.
 */
function CalendarPreview() {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 21 }, (_, i) => (
        <div
          key={i}
          className="aspect-square rounded-sm bg-black/5 dark:bg-white/10"
        >
          {i % 5 === 2 ? (
            <div className="mx-auto mt-1 h-1 w-3/4 rounded-full bg-teal-500/70" />
          ) : null}
          {i % 7 === 4 ? (
            <div className="mx-auto mt-1 h-1 w-3/4 rounded-full bg-orange-500/70" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function WeekPreview() {
  return (
    <div className="flex flex-col gap-1.5">
      {[true, true, false, false].map((done, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`h-3 w-3 shrink-0 rounded-sm ${
              done ? "bg-amber-400" : "border border-black/20 dark:border-white/25"
            }`}
          />
          <div
            className="h-2 rounded-full bg-black/10 dark:bg-white/15"
            style={{ width: `${70 - i * 12}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function ShoppingPreview() {
  return (
    <div className="flex flex-col gap-1.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-3 w-3 shrink-0 rounded-full border border-black/20 dark:border-white/25" />
          <div
            className="h-2 rounded-full bg-black/10 dark:bg-white/15"
            style={{ width: `${55 + ((i * 13) % 35)}%` }}
          />
          {i === 1 ? (
            <div className="ml-auto h-2 w-8 shrink-0 rounded-full bg-amber-400/70" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PantryPreview() {
  return (
    <div className="flex flex-col gap-2">
      {[80, 45, 20].map((fill, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="h-2 rounded-full bg-black/10 dark:bg-white/15"
            style={{ width: "34%" }}
          />
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div
              className={`h-full rounded-full ${
                fill < 30 ? "bg-amber-400" : "bg-teal-500/70"
              }`}
              style={{ width: `${fill}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const SECTIONS: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  preview: () => React.ReactElement;
}[] = [
  {
    href: "/calendar",
    label: "Calendar",
    description:
      "Plan meals across the month. Set how many portions you're cooking and they spread across consecutive days automatically.",
    icon: CalendarDays,
    preview: CalendarPreview,
  },
  {
    href: "/week",
    label: "This Week",
    description:
      "Your prep list and the week's macros — one checkbox per recipe, however many days you eat it, plus daily and weekly totals.",
    icon: UtensilsCrossed,
    preview: WeekPreview,
  },
  {
    href: "/shopping",
    label: "Shopping list",
    description:
      "Built from the week's plan, with quantities added up and duplicate names merged. Pantry staples are left off unless you'd run out.",
    icon: ShoppingCart,
    preview: ShoppingPreview,
  },
  {
    href: "/pantry",
    label: "Pantry staples",
    description:
      "What you keep on hand, by category. Weigh what's left and the shopping list flags a restock before a week runs you dry.",
    icon: Refrigerator,
    preview: PantryPreview,
  },
];

export default function OrganizationPage() {
  return (
    <>
      <PageHeader
        title="Organization"
        description="Planning, prepping, and shopping — everything between picking a recipe and cooking it."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ href, label, description, icon: Icon, preview: Preview }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-xl border border-black/10 bg-surface p-5 transition-colors hover:border-amber-400/60 dark:border-white/10"
          >
            <div className="mb-4 rounded-lg bg-canvas p-4">
              <Preview />
            </div>

            <h2 className="flex items-center gap-2 font-semibold">
              <Icon className="h-4 w-4 text-amber-500" />
              {label}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
