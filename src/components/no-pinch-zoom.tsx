"use client";

import { useEffect } from "react";

/**
 * Blocks pinch-zoom on touch screens.
 *
 * The viewport meta alone isn't enough: Safari has ignored user-scalable=no
 * since iOS 10 and honours it only for an installed app, so on the web it
 * takes cancelling the gesture events Safari raises for a two-finger pinch.
 * Android respects the meta and never reaches this.
 *
 * Deliberate, and worth being plain about: pinch-zoom is a genuine
 * accessibility affordance and this takes it away. The trade is that a page
 * left zoomed by a stray gesture strands someone who doesn't know how to
 * undo it, and the people most likely to be stranded are the ones least
 * likely to work it out. The app's own text is sized to be read without it.
 */
export function NoPinchZoom() {
  useEffect(() => {
    // Non-standard, WebKit-only, and the only hook for this on iOS.
    const cancel = (e: Event) => e.preventDefault();
    const events = ["gesturestart", "gesturechange", "gestureend"];
    for (const name of events) {
      document.addEventListener(name, cancel, { passive: false });
    }

    // Belt and braces for WebViews that raise no gesture events: a touchmove
    // with more than one finger down is a pinch by definition. Single-finger
    // moves are untouched, so scrolling is unaffected.
    const pinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("touchmove", pinch, { passive: false });

    return () => {
      for (const name of events) document.removeEventListener(name, cancel);
      document.removeEventListener("touchmove", pinch);
    };
  }, []);

  return null;
}
