/** Kitchen-friendly quantity display: 0.5 → "½", 1.5 → "1 ½", 0.33 → "⅓". */

const UNICODE_FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
];

const TOLERANCE = 0.05;

export function formatQuantity(value: number): string {
  if (value <= 0) return "";

  const whole = Math.floor(value);
  const frac = value - whole;

  if (frac < TOLERANCE) {
    return String(whole);
  }

  for (const [target, glyph] of UNICODE_FRACTIONS) {
    if (Math.abs(frac - target) < TOLERANCE) {
      return whole > 0 ? `${whole} ${glyph}` : glyph;
    }
  }

  // No pretty fraction close enough — show a compact decimal.
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}
