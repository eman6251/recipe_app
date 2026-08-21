"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { TourStep } from "@/lib/tour";

type Rect = { top: number; left: number; width: number; height: number };

const MAX_CARD_WIDTH = 340;
const GAP = 28; // breathing room between the callout and the thing it points at
const MARGIN = 16; // keep the card off the viewport edge

/** Full width less the margins on a phone, capped at a readable line length. */
function cardWidth(viewportWidth: number): number {
  return Math.min(MAX_CARD_WIDTH, viewportWidth - MARGIN * 2);
}

/**
 * Where to put the callout: whichever side of the target has room, preferring
 * below, since a card above the target tends to cover the page heading.
 */
function placeCard(
  target: Rect | null,
  cardHeight: number,
  viewport: { width: number; height: number },
): { top: number; left: number; side: "top" | "bottom" | "left" | "right" | "center" } {
  const width = cardWidth(viewport.width);

  if (!target) {
    return {
      top: viewport.height / 2 - cardHeight / 2,
      left: viewport.width / 2 - width / 2,
      side: "center",
    };
  }

  const clampX = (x: number) =>
    Math.max(MARGIN, Math.min(x, viewport.width - width - MARGIN));
  const clampY = (y: number) =>
    Math.max(MARGIN, Math.min(y, viewport.height - cardHeight - MARGIN));

  const below = target.top + target.height + GAP;
  if (below + cardHeight + MARGIN <= viewport.height) {
    return {
      top: below,
      left: clampX(target.left + target.width / 2 - width / 2),
      side: "bottom",
    };
  }

  const above = target.top - GAP - cardHeight;
  if (above >= MARGIN) {
    return {
      top: above,
      left: clampX(target.left + target.width / 2 - width / 2),
      side: "top",
    };
  }

  const right = target.left + target.width + GAP;
  if (right + width + MARGIN <= viewport.width) {
    return {
      top: clampY(target.top + target.height / 2 - cardHeight / 2),
      left: right,
      side: "right",
    };
  }

  return {
    top: clampY(target.top + target.height / 2 - cardHeight / 2),
    left: clampX(target.left - GAP - width),
    side: "left",
  };
}

/**
 * A hand-drawn-ish curve from the callout to its target.
 *
 * The control points are pushed out perpendicular to the straight line between
 * the two, which is what gives the arc its lean instead of a flat quarter
 * circle. Bend scales with distance so short hops don't loop.
 */
function curvePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const bend = Math.min(distance * 0.35, 90);

  // Unit normal, so the bow is always sideways to the direction of travel.
  const nx = -dy / distance;
  const ny = dx / distance;

  const c1 = { x: from.x + dx * 0.25 + nx * bend, y: from.y + dy * 0.25 + ny * bend };
  const c2 = { x: from.x + dx * 0.75 + nx * bend, y: from.y + dy * 0.75 + ny * bend };

  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}

export function Spotlight({
  step,
  index,
  total,
  onNext,
  onBack,
  onClose,
}: {
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(220);
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });
  const [card, setCard] = useState<HTMLDivElement | null>(null);

  // Find and follow the target. It may not exist yet: the tour navigates to a
  // new route and the element arrives a beat later, so this keeps looking.
  useEffect(() => {
    if (!step.target) return;

    let frame = 0;
    let attempts = 0;

    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) {
        // Give up after a few seconds and show the card centred instead of
        // pointing at nothing.
        if (attempts++ < 180) frame = requestAnimationFrame(measure);
        else setTarget(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setTarget({ top: r.top, left: r.left, width: r.width, height: r.height });
      frame = requestAnimationFrame(measure);
    };

    measure();
    return () => cancelAnimationFrame(frame);
  }, [step.target]);

  // Bring the target into view before pointing at it.
  useEffect(() => {
    if (!step.target) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [step.target]);

  useLayoutEffect(() => {
    const sync = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useLayoutEffect(() => {
    if (!card) return;
    const observer = new ResizeObserver(() => setCardHeight(card.offsetHeight));
    observer.observe(card);
    return () => observer.disconnect();
  }, [card]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "Enter") onNext();
      if (e.key === "ArrowLeft") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onBack]);

  const placement = placeCard(target, cardHeight, viewport);
  const width = cardWidth(viewport.width);
  const padding = 8;

  // Anchor the arrow on the card edge facing the target, and land it just
  // short of the target's edge so the head doesn't sit on top of the content.
  let arrow: { from: { x: number; y: number }; to: { x: number; y: number } } | null =
    null;
  if (target && placement.side !== "center") {
    const cardCentre = {
      x: placement.left + width / 2,
      y: placement.top + cardHeight / 2,
    };
    const targetCentre = {
      x: target.left + target.width / 2,
      y: target.top + target.height / 2,
    };
    const from = {
      x:
        placement.side === "right"
          ? placement.left
          : placement.side === "left"
            ? placement.left + width
            : cardCentre.x,
      y: placement.side === "bottom" ? placement.top : placement.side === "top" ? placement.top + cardHeight : cardCentre.y,
    };
    const to = {
      x: targetCentre.x,
      y:
        placement.side === "bottom"
          ? target.top + target.height + padding
          : placement.side === "top"
            ? target.top - padding
            : targetCentre.y,
    };
    if (placement.side === "left") to.x = target.left - padding;
    if (placement.side === "right") to.x = target.left + target.width + padding;
    arrow = { from, to };
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Dim everything, with a hole punched over the target. */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {target ? (
              <rect
                x={target.left - padding}
                y={target.top - padding}
                width={target.width + padding * 2}
                height={target.height + padding * 2}
                rx="12"
                fill="black"
              />
            ) : null}
          </mask>
          <marker
            id="tour-arrowhead"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(251 191 36)" />
          </marker>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill="rgb(0 0 0 / 0.65)"
          mask="url(#tour-mask)"
        />

        {target ? (
          <rect
            x={target.left - padding}
            y={target.top - padding}
            width={target.width + padding * 2}
            height={target.height + padding * 2}
            rx="12"
            fill="none"
            stroke="rgb(251 191 36)"
            strokeWidth="2"
          />
        ) : null}

        {arrow ? (
          <path
            d={curvePath(arrow.from, arrow.to)}
            fill="none"
            stroke="rgb(251 191 36)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="1 9"
            markerEnd="url(#tour-arrowhead)"
          />
        ) : null}
      </svg>

      <div
        ref={setCard}
        style={{
          top: placement.top,
          left: placement.left,
          width,
        }}
        className="absolute rounded-2xl border border-amber-400/40 bg-surface p-5 shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close walkthrough"
          className="absolute right-3 top-3 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          Step {index + 1} of {total}
        </p>
        <h2 className="mt-1 pr-6 text-lg font-semibold leading-snug">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {step.body}
        </p>
        {step.tip ? (
          <p className="mt-3 rounded-lg border-l-2 border-amber-400 bg-amber-400/5 py-2 pl-3 pr-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            {step.tip}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="text-xs font-medium text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {index > 0 ? (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            ) : null}
            <button
              onClick={onNext}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
            >
              {index === total - 1 ? "Done" : "Next"}
              {index === total - 1 ? null : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
