/** Kitchen-friendly quantity display: 0.5 → "½", 1.5 → "1 ½", 0.33 → "⅓". */

const GLYPH_VALUES: Record<string, number> = {
  "⅛": 1 / 8,
  "¼": 1 / 4,
  "⅓": 1 / 3,
  "⅜": 3 / 8,
  "½": 1 / 2,
  "⅝": 5 / 8,
  "⅔": 2 / 3,
  "¾": 3 / 4,
  "⅞": 7 / 8,
};

/**
 * Parse kitchen-style quantity input: "1/2", "1 1/2", "½", "1½", "1.5", "2".
 * Returns null for empty/unparseable input.
 */
export function parseQuantity(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  let total = 0;
  let matched = false;

  // Trailing unicode fraction, e.g. "½" or "1½" / "1 ½"
  const last = s[s.length - 1];
  if (last in GLYPH_VALUES) {
    total += GLYPH_VALUES[last];
    s = s.slice(0, -1).trim();
    matched = true;
    if (!s) return total;
  }

  // "a b/c" mixed number, "b/c" plain fraction, or plain number
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const denom = Number(mixed[3]);
    if (denom === 0) return null;
    return total + Number(mixed[1]) + Number(mixed[2]) / denom;
  }
  if (frac) {
    const denom = Number(frac[2]);
    if (denom === 0) return null;
    return total + Number(frac[1]) / denom;
  }

  const n = Number(s);
  if (Number.isFinite(n)) return total + n;

  return null;
}

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
