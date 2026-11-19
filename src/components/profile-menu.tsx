"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Monitor, Moon, Settings, Sun, UserRound } from "lucide-react";
import { signout } from "@/app/login/actions";
import { THEME_COOKIE, themeAttribute, type ThemeChoice } from "@/lib/theme";

/**
 * The avatar menu: who you are, how the app behaves, and which theme.
 *
 * Theme used to live three clicks into the profile page, which is the wrong
 * place for the one setting people change by time of day. Here it's a row of
 * three icons you can reach from anywhere.
 *
 * Click to open rather than hover. The menu holds controls rather than just
 * links, and a hover menu closes the moment the pointer strays — which is
 * easy to do while reaching for the middle of three small buttons.
 *
 * On a phone it comes up from the bottom instead of hanging off the corner.
 * A sheet rather than a page, which is where I'd differ from the obvious
 * answer: a page costs a navigation each way for something as small as
 * flipping to dark, and the sheet is the pattern the day view already uses.
 */

const THEMES: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ProfileMenu({
  avatarUrl,
  theme,
}: {
  avatarUrl: string | null;
  theme: ThemeChoice;
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<ThemeChoice>(theme);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // The document is outside React's tree, so touching it belongs here.
  useEffect(() => {
    const attribute = themeAttribute(choice);
    if (attribute) document.documentElement.dataset.theme = attribute;
    else delete document.documentElement.dataset.theme;
    document.cookie = `${THEME_COOKIE}=${choice}; path=/; max-age=31536000; samesite=lax`;
  }, [choice]);

  const items = (
    <>
      <MenuLink href="/profile" icon={<UserRound className="h-4 w-4" />}>
        My profile
      </MenuLink>
      <MenuLink href="/settings" icon={<Settings className="h-4 w-4" />}>
        Settings
      </MenuLink>

      <div className="my-1 border-t border-black/10 dark:border-white/10" />

      <div className="px-3 py-2">
        <p className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">Theme</p>
        <div
          role="radiogroup"
          aria-label="Colour theme"
          className="flex gap-1 rounded-lg border border-black/10 p-0.5 dark:border-white/10"
        >
          {THEMES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={choice === value}
              aria-label={label}
              title={label}
              onClick={() => setChoice(value)}
              className={`flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors ${
                choice === value
                  ? "bg-amber-400 text-zinc-950"
                  : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="my-1 border-t border-black/10 dark:border-white/10" />

      <form action={signout}>
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-600 transition-colors hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </form>
    </>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`block overflow-hidden rounded-full border-2 transition-colors ${
          open
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
            sizes="32px"
            className="h-8 w-8 object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center bg-black/5 text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
            <UserRound className="h-4 w-4" />
          </span>
        )}
      </button>

      {open ? (
        <>
          {/* Desktop: hangs off the avatar. */}
          <div className="absolute right-0 top-full z-50 mt-2 hidden w-56 rounded-xl border border-black/10 bg-surface py-1 shadow-xl md:block dark:border-white/10">
            {items}
          </div>

          {/* Phone: comes up from the bottom, clear of the floating bar. */}
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            <div
              style={{
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
              }}
              className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-black/10 bg-surface pt-2 shadow-2xl dark:border-white/10"
            >
              {items}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
    >
      {icon}
      {children}
    </Link>
  );
}
