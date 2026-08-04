"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "install-prompt-dismissed";

/**
 * Offers to install the app to the home screen.
 *
 * Android and desktop Chrome fire `beforeinstallprompt`, which lets us show a
 * real one-tap install button. iOS Safari has no such API — Apple only allows
 * Share → Add to Home Screen — so there we show the instruction instead of a
 * button that couldn't work.
 */
/** Nothing to offer if it's already installed, or previously dismissed. */
function shouldOffer(): boolean {
  if (localStorage.getItem(DISMISSED_KEY)) return false;
  return !(
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS reports installed state on navigator instead of via media query.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [mode, setMode] = useState<null | "install" | "ios">(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      if (!shouldOffer()) return;
      e.preventDefault(); // suppress the browser's own banner in favour of ours
      setDeferred(e as InstallEvent);
      setMode("install");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Deferred a frame so the iOS check doesn't set state during this
    // effect's own commit; there's no event to hang it off on Safari.
    const raf = requestAnimationFrame(() => {
      if (!shouldOffer()) return;
      const ua = window.navigator.userAgent;
      const isIos = /iPad|iPhone|iPod/.test(ua);
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
      if (isIos && isSafari) setMode("ios");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      cancelAnimationFrame(raf);
    };
  }, []);

  const close = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setMode(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    close();
  };

  if (mode === null) return null;

  return (
    <div className="mx-auto mb-4 flex w-full max-w-6xl items-center gap-3 rounded-xl border border-amber-400/40 bg-surface px-4 py-3">
      <div className="flex-1 text-sm">
        {mode === "install" ? (
          <>
            <strong>Add Skillet to your home screen</strong> — it opens like an
            app, full screen.
          </>
        ) : (
          <>
            <strong>Add Skillet to your home screen:</strong> tap{" "}
            <Share className="inline h-4 w-4 align-text-bottom" /> below, then{" "}
            <strong>Add to Home Screen</strong>.
          </>
        )}
      </div>

      {mode === "install" ? (
        <button
          onClick={install}
          className="shrink-0 rounded-lg bg-amber-400 px-3.5 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
        >
          Install
        </button>
      ) : null}

      <button
        onClick={close}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
