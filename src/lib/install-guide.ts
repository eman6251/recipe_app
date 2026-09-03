/**
 * Which browser someone is in, and how that browser installs a web app.
 *
 * There's no API for this — installing is a browser-chrome action and the page
 * can't see the menus it lives in — so it's user-agent sniffing, which is
 * guesswork. Every guide therefore has to read sensibly to someone who landed
 * on it wrongly, and none of them promise a menu item exists by name alone
 * without saying where to look for it.
 *
 * The one browser that does expose an API is Chromium, via
 * `beforeinstallprompt`. When that fires we show a real button instead of
 * instructions, and none of this matters.
 */

export type Platform = "ios" | "android" | "desktop";

export type InstallGuide = {
  platform: Platform;
  /** Shown in the heading, e.g. "Safari". */
  browserName: string;
  /** Ordered instructions. Short — these are read one-handed. */
  steps: string[];
  /** Which icon to draw beside the steps. */
  icon: "share" | "menu" | "plus";
  /**
   * Set when this browser can't install and the user needs a different one.
   * More useful than instructions for a menu item that isn't there.
   */
  redirect?: string;
};

type Ua = { ua: string; touchPoints: number; maxTouch: number };

function readAgent(): Ua {
  return {
    ua: navigator.userAgent,
    touchPoints: navigator.maxTouchPoints ?? 0,
    maxTouch: navigator.maxTouchPoints ?? 0,
  };
}

/** iPadOS reports itself as a Mac, and only the touch count gives it away. */
function isIos({ ua, maxTouch }: Ua): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouch > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS reports installed state on navigator rather than via a media query.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function detectInstallGuide(): InstallGuide {
  const agent = typeof navigator === "undefined"
    ? { ua: "", touchPoints: 0, maxTouch: 0 }
    : readAgent();
  const { ua } = agent;

  // ---------------------------------------------------------------- iOS
  if (isIos(agent)) {
    // Every browser on iOS is Safari underneath, but only some of them
    // surface Add to Home Screen in their own share sheet.
    if (/FxiOS/.test(ua)) {
      return {
        platform: "ios",
        browserName: "Firefox",
        icon: "share",
        steps: [
          "Firefox on iPhone can't add apps to the home screen.",
          "Open this page in Safari, then tap Share → Add to Home Screen.",
        ],
        redirect: "Safari",
      };
    }
    if (/CriOS/.test(ua)) {
      return {
        platform: "ios",
        browserName: "Chrome",
        icon: "share",
        steps: [
          "Tap the Share button in the address bar.",
          "Scroll down and tap Add to Home Screen.",
          "If it isn't there, open this page in Safari instead.",
        ],
      };
    }
    if (/EdgiOS/.test(ua)) {
      return {
        platform: "ios",
        browserName: "Edge",
        icon: "menu",
        steps: [
          "Tap the ••• menu at the bottom.",
          "Tap Add to Phone, or Share → Add to Home Screen.",
          "If neither is there, open this page in Safari instead.",
        ],
      };
    }
    return {
      platform: "ios",
      browserName: "Safari",
      icon: "share",
      steps: [
        "Tap the Share button at the bottom of the screen.",
        "Scroll down the list and tap Add to Home Screen.",
        "Tap Add. Skillet appears with your other apps.",
      ],
    };
  }

  // ------------------------------------------------------------- Android
  if (/Android/.test(ua)) {
    if (/SamsungBrowser/.test(ua)) {
      return {
        platform: "android",
        browserName: "Samsung Internet",
        icon: "menu",
        steps: [
          "Tap the ☰ menu at the bottom right.",
          "Tap Add page to, then Home screen.",
        ],
      };
    }
    if (/Firefox|FxiOS/.test(ua)) {
      return {
        platform: "android",
        browserName: "Firefox",
        icon: "menu",
        steps: [
          "Tap the ⋮ menu at the top right.",
          "Tap Install, or Add to Home screen.",
        ],
      };
    }
    // Chrome, Edge, Opera and the rest of Chromium. These normally fire
    // beforeinstallprompt and never reach these instructions, but the event
    // doesn't fire on a repeat visit within the same session.
    return {
      platform: "android",
      browserName: /EdgA/.test(ua) ? "Edge" : "Chrome",
      icon: "menu",
      steps: [
        "Tap the ⋮ menu at the top right.",
        "Tap Add to Home screen, or Install app.",
      ],
    };
  }

  // ------------------------------------------------------------- desktop
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) {
    return {
      platform: "desktop",
      browserName: "Safari",
      icon: "share",
      steps: [
        "Click the Share button in the toolbar.",
        "Choose Add to Dock.",
      ],
    };
  }
  if (/Firefox/.test(ua)) {
    return {
      platform: "desktop",
      browserName: "Firefox",
      icon: "plus",
      steps: [
        "Firefox on desktop can't install web apps.",
        "Chrome, Edge or Safari will add Skillet to your dock.",
      ],
      redirect: "Chrome, Edge or Safari",
    };
  }
  return {
    platform: "desktop",
    browserName: "your browser",
    icon: "plus",
    steps: [
      "Look for an install icon at the right of the address bar.",
      "Or open the ⋮ menu and choose Install Skillet.",
    ],
  };
}
