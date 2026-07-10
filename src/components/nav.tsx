"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChefHat,
  BookOpen,
  CalendarDays,
  UtensilsCrossed,
  ShoppingCart,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { signout } from "@/app/login/actions";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: ChefHat },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/week", label: "This Week", icon: UtensilsCrossed },
  { href: "/shopping", label: "Shopping", icon: ShoppingCart },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: left sidebar */}
      <nav className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-black/10 bg-white px-3 py-6 dark:border-white/10 dark:bg-zinc-950">
        <Link href="/" className="mb-8 flex items-center gap-2 px-3">
          <ChefHat className="h-6 w-6 text-emerald-600" />
          <span className="text-lg font-semibold tracking-tight">Skillet</span>
        </Link>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <form action={signout} className="mt-auto">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </form>
      </nav>

      {/* Mobile: bottom tab bar */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-10 flex border-t border-black/10 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                active
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
