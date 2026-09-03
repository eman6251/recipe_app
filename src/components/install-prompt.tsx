"use client";

import { useEffect, useState } from "react";
import { MoreVertical, Plus, Share, Smartphone, X } from "lucide-react";
import {
  detectInstallGuide,
  isStandalone,
  type InstallGuide,
} from "@/lib/install-guide";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "install-prompt-dismissed";

const ICONS = { share: Share, menu: MoreVertical, plus: Plus };

/**
 * Offers to put Skillet on the home screen, in the terms of the browser
 * actually being used.
 *
 * Chromium fires `beforeinstallprompt`, which buys a real one-tap button.
 * Nothing else does — installing is a browser-chrome action and the page can't
 * reach the menus it lives in — so everywhere else this shows the specific
 * taps for that browser rather than a generic "add to home screen", which is
 * useless if you can't find the menu it means.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [guide, setGuide] = useState<InstallGuide | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) || isStandalone()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // suppress the browser's own banner in favour of ours
      setDeferred(e as InstallEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Deferred a frame so this doesn't set state during its own commit; on
    // Safari there's no event to hang it off.
    const raf = requestAnimationFrame(() => {
      setGuide(detectInstallGuide());
      setOpen(true);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      cancelAnimationFrame(raf);
    };
  }, []);

  const close = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setOpen(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    close();
  };

  if (!open || (!guide && !deferred)) return null;

  const Icon = guide ? ICONS[guide.icon] : Smartphone;

  return (
    // Above the mobile tab bar, out of the way of the thumb on the way past.
    <div className="fixed inset-x-3 bottom-24 z-40 md:inset-x-auto md:bottom-6 md:right-6 md:w-96">
      <div className="rounded-2xl border border-amber-400/40 bg-surface p-4 shadow-2xl">
        <button
          onClick={close}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400">
            <Smartphone className="h-4 w-4" />
          </span>
          <div className="min-w-0 pr-4">
            <h2 className="text-sm font-semibold">Use Skillet as an app</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Opens full screen with no address bar — better in the kitchen and
              at the shop.
            </p>
          </div>
        </div>

        {deferred ? (
          <button
            onClick={install}
            className="mt-3 w-full rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
          >
            Install
          </button>
        ) : guide ? (
          <div className="mt-3 rounded-xl bg-canvas p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium">
              <Icon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              In {guide.browserName}
            </p>
            <ol className="flex flex-col gap-1.5">
              {guide.steps.map((stepText, i) => (
                <li
                  key={stepText}
                  className="flex gap-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300"
                >
                  {guide.redirect ? (
                    <span className="text-amber-600 dark:text-amber-400">•</span>
                  ) : (
                    <span className="shrink-0 font-semibold text-amber-600 dark:text-amber-400">
                      {i + 1}.
                    </span>
                  )}
                  <span>{stepText}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  );
}
