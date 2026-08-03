"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChefHat,
  BookOpen,
  BookMarked,
  CalendarDays,
  UtensilsCrossed,
  ShoppingCart,
  Refrigerator,
  Carrot,
  LogOut,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { signout } from "@/app/login/actions";
import { FILTER_GROUPS } from "@/lib/filters";
import { INGREDIENT_GROUPS } from "@/lib/ingredients";

/**
 * The mobile tab bar only. Desktop renders DESKTOP_ITEMS instead, where
 * Calendar/This Week/Shopping/Pantry live under the Organization menu —
 * a phone has no room for a mega-menu, so those stay top-level here.
 */
type MobileItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Too many destinations for a phone; these drop off the tab bar. */
  desktopOnly?: boolean;
};

const MOBILE_ITEMS: MobileItem[] = [
  { href: "/", label: "Home", icon: ChefHat },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/ingredients", label: "Ingredients", icon: Carrot, desktopOnly: true },
  { href: "/recipe-box", label: "Recipe Box", icon: BookMarked },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/week", label: "This Week", icon: UtensilsCrossed },
  { href: "/shopping", label: "Shopping", icon: ShoppingCart },
  { href: "/pantry", label: "Pantry", icon: Refrigerator, desktopOnly: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Menu columns for the Recipes tab, built from the shared filter vocabulary. */
const RECIPE_MENU = [
  {
    label: "Everyday",
    links: FILTER_GROUPS.find((g) => g.id === "popular")!.options.map((o) => ({
      label: o.label,
      href: `/recipes?f=${o.id}`,
    })),
  },
  {
    label: "By meal",
    links: FILTER_GROUPS.find((g) => g.id === "meal")!.options.map((o) => ({
      label: o.label,
      href: `/recipes?f=${o.id}`,
    })),
  },
  {
    label: "By diet",
    links: FILTER_GROUPS.find((g) => g.id === "diet")!.options.map((o) => ({
      label: o.label,
      href: `/recipes?f=${o.id}`,
    })),
  },
  {
    label: "By method",
    links: [
      ...FILTER_GROUPS.find((g) => g.id === "equipment")!.options,
      ...FILTER_GROUPS.find((g) => g.id === "time")!.options,
    ].map((o) => ({ label: o.label, href: `/recipes?f=${o.id}` })),
  },
];

const INGREDIENT_MENU = INGREDIENT_GROUPS.map((group) => ({
  label: group.label,
  links: group.items.map((i) => ({
    label: i.label,
    href: `/ingredients/${i.slug}`,
  })),
}));

const ORGANIZATION_MENU = [
  {
    label: "Meal prep",
    links: [
      { label: "Calendar", href: "/calendar" },
      { label: "This Week", href: "/week" },
    ],
  },
  {
    label: "Groceries",
    links: [
      { label: "Shopping list", href: "/shopping" },
      { label: "Pantry staples", href: "/pantry" },
    ],
  },
];

type MenuColumns = { label: string; links: { label: string; href: string }[] }[];

type DesktopItem = {
  label: string;
  /** Absent for menu-only tabs, which have no page of their own. */
  href?: string;
  menu?: MenuColumns;
  /** Paths that should light this tab up, for menu-only entries. */
  matches?: string[];
};

const DESKTOP_ITEMS: DesktopItem[] = [
  { label: "Home", href: "/" },
  { label: "Recipes", href: "/recipes", menu: RECIPE_MENU },
  { label: "Ingredients", href: "/ingredients", menu: INGREDIENT_MENU },
  {
    label: "Organization",
    menu: ORGANIZATION_MENU,
    matches: ["/calendar", "/week", "/shopping", "/pantry"],
  },
];

function MegaMenu({
  columns,
  onNavigate,
}: {
  columns: { label: string; links: { label: string; href: string }[] }[];
  onNavigate: () => void;
}) {
  return (
    <div className="absolute left-0 top-full z-40 w-[min(94vw,56rem)] rounded-b-xl border border-t-0 border-black/10 bg-surface p-6 shadow-xl dark:border-white/15">
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
        {columns.map((col) => (
          <div key={col.label}>
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {col.label}
            </h3>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    className="text-sm text-zinc-700 transition-colors hover:text-amber-600 dark:text-zinc-300 dark:hover:text-amber-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Nav({
  avatarUrl,
  signedIn = true,
}: {
  avatarUrl?: string | null;
  signedIn?: boolean;
}) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const itemActive = (item: DesktopItem) =>
    item.href
      ? isActive(pathname, item.href)
      : (item.matches ?? []).some((p) => isActive(pathname, p));

  return (
    <>
      {/* Desktop: top bar with hover mega-menus */}
      <header
        className="sticky top-0 z-30 hidden border-b border-black/10 bg-surface md:block dark:border-white/10"
        onMouseLeave={() => setOpenMenu(null)}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <ChefHat className="h-6 w-6 text-amber-500" />
            <span className="text-lg font-semibold tracking-tight">Skillet</span>
          </Link>

          <nav className="flex items-center gap-1">
            {DESKTOP_ITEMS.map((item) => {
              const active = itemActive(item);
              const className = `block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`;
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenMenu(item.menu ? item.label : null)}
                >
                  {item.href ? (
                    <Link href={item.href} className={className}>
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() =>
                        setOpenMenu(openMenu === item.label ? null : item.label)
                      }
                      className={className}
                    >
                      {item.label}
                    </button>
                  )}
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-3 h-0.5 rounded bg-amber-500" />
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {signedIn ? (
              <>
            <Link
              href="/recipe-box"
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive(pathname, "/recipe-box")
                  ? "border-amber-400 text-amber-600 dark:text-amber-400"
                  : "border-black/10 text-zinc-600 hover:text-zinc-900 dark:border-white/15 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <BookMarked className="h-4 w-4" />
              Recipe Box
            </Link>

            <Link
              href="/profile"
              aria-label="Profile"
              className={`block overflow-hidden rounded-full border-2 transition-colors ${
                isActive(pathname, "/profile")
                  ? "border-amber-400"
                  : "border-transparent hover:border-black/15 dark:hover:border-white/20"
              }`}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center bg-black/5 text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                  <UserRound className="h-4 w-4" />
                </span>
              )}
            </Link>
            <form action={signout}>
              <button
                type="submit"
                aria-label="Sign out"
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </form>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-amber-400 px-4 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
              >
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* The panel sits outside the row so it spans the full width. */}
        <div className="relative mx-auto w-full max-w-6xl px-6">
          {openMenu ? (
            <MegaMenu
              columns={
                DESKTOP_ITEMS.find((i) => i.label === openMenu)!.menu!
              }
              onNavigate={() => setOpenMenu(null)}
            />
          ) : null}
        </div>
      </header>

      {/* Mobile: bottom tab bar — a top bar can't hold eight destinations. */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 flex border-t border-black/10 bg-surface/95 backdrop-blur dark:border-white/10">
        {MOBILE_ITEMS.filter((item) => !item.desktopOnly).map(
          ({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
                  active
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          },
        )}
      </nav>
    </>
  );
}
