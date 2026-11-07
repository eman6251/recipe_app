"use client";

import { useState } from "react";
import type { Macros } from "@/lib/types";

/**
 * The three macronutrients as a share of a meal plan's calories.
 *
 * Split by calories, not by grams. Fat carries 9 kcal a gram against 4 for
 * protein and carbohydrate, so a gram-based ring shows fat at roughly half
 * its real contribution — 8g of fat beside 118g of carbs looks like a sliver
 * and is a tenth of the energy. Grams are still printed in the legend,
 * because that's what a label on a packet says.
 *
 * Three segments, part-to-whole, read at a glance — which is the only job a
 * ring does well. Hues are categorical slots 1–3 in fixed order, validated
 * for colour-vision separation against both of this app's surfaces; the
 * legend repeats every value as text, so nothing is carried by colour alone.
 */

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

type Slice = {
  key: "protein" | "carbs" | "fat";
  label: string;
  grams: number;
  kcal: number;
  /** CSS custom property holding this slot's hue. */
  color: string;
};

const SIZE = 132;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
/** Surface-coloured gap between segments, in pathLength units (total 100). */
const GAP = 1.2;

export function MacroDonut({
  macros,
  /** Shown under the ring: what one whole ring represents. */
  caption,
}: {
  macros: Macros;
  caption: string;
}) {
  const [hovered, setHovered] = useState<Slice["key"] | null>(null);

  const slices: Slice[] = [
    {
      key: "protein",
      label: "Protein",
      grams: macros.protein_g,
      kcal: macros.protein_g * KCAL_PER_GRAM.protein,
      color: "var(--macro-protein)",
    },
    {
      key: "carbs",
      label: "Carbs",
      grams: macros.carbs_g,
      kcal: macros.carbs_g * KCAL_PER_GRAM.carbs,
      color: "var(--macro-carbs)",
    },
    {
      key: "fat",
      label: "Fat",
      grams: macros.fat_g,
      kcal: macros.fat_g * KCAL_PER_GRAM.fat,
      color: "var(--macro-fat)",
    },
  ];

  // Energy from the macros themselves rather than the recipe's kcal figure:
  // the ring has to sum to its own parts or the percentages won't add up.
  const totalKcal = slices.reduce((sum, s) => sum + s.kcal, 0);
  const active = hovered ? slices.find((s) => s.key === hovered) : null;

  if (totalKcal <= 0) {
    return (
      <div className="macro-viz flex items-center gap-4">
        <svg width={SIZE} height={SIZE} role="img" aria-label="No macro data yet">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-black/5 dark:stroke-white/10"
          />
        </svg>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          No macro data yet.
        </p>
      </div>
    );
  }

  let offset = 0;

  return (
    <div className="macro-viz flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={`Calories by macronutrient: ${slices
            .map(
              (s) =>
                `${s.label} ${Math.round((s.kcal / totalKcal) * 100)} percent`,
            )
            .join(", ")}`}
        >
          {slices.map((slice) => {
            const share = (slice.kcal / totalKcal) * 100;
            if (share <= 0) return null;
            const dash = Math.max(share - GAP, 0.5);
            const segment = (
              <circle
                key={slice.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE}
                strokeLinecap="butt"
                // pathLength normalises the circumference to 100, so a dash
                // array can be written straight in percentage points.
                pathLength={100}
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                opacity={hovered && hovered !== slice.key ? 0.35 : 1}
                className="cursor-default transition-opacity"
                onMouseEnter={() => setHovered(slice.key)}
                onMouseLeave={() => setHovered(null)}
              />
            );
            offset += share;
            return segment;
          })}
        </svg>

        {/* Centre reads the whole by default, and whichever segment is under
            the cursor when there is one. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {active ? (
            <>
              <span className="text-base font-semibold tabular-nums">
                {Math.round((active.kcal / totalKcal) * 100)}%
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {active.label}
              </span>
            </>
          ) : (
            <>
              <span className="text-base font-semibold tabular-nums">
                {Math.round(totalKcal).toLocaleString()}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                kcal
              </span>
            </>
          )}
        </div>
      </div>

      {/* Every value also printed, so identity and magnitude never depend on
          telling the colours apart. */}
      <dl className="flex min-w-0 flex-col gap-1.5">
        {slices.map((slice) => (
          <div
            key={slice.key}
            className="flex items-baseline gap-2 text-xs"
            onMouseEnter={() => setHovered(slice.key)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: slice.color }}
            />
            <dt className="w-14 shrink-0 text-zinc-500 dark:text-zinc-400">
              {slice.label}
            </dt>
            <dd className="tabular-nums font-medium">
              {Math.round(slice.grams).toLocaleString()}g
              <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                {Math.round((slice.kcal / totalKcal) * 100)}% of kcal
              </span>
            </dd>
          </div>
        ))}
        <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
          {caption}
        </p>
      </dl>
    </div>
  );
}
