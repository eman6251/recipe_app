/**
 * "What can I make?" matching: a recipe qualifies when every ingredient line
 * is covered by either an ingredient the user has on hand or a pantry staple.
 *
 * Matching is intentionally forgiving — "chicken" covers "boneless chicken
 * thighs", "garlic" covers "granulated garlic" — via normalized substring
 * matching in both directions plus naive singularization.
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "tomatoes" → "tomato", "thighs" → "thigh". Naive but good enough. */
function singularize(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean).map(singularize);
}

/**
 * Size adjectives, dropped when grouping for the shopping list: a recipe
 * calling for a large lime in the marinade and a lime in the sauce still
 * means buying limes. Deliberately excludes words that change what you'd
 * actually buy — "whole" milk, "extra virgin" oil, "baby" spinach — and
 * anything about form ("fresh" vs "dried" herbs are not interchangeable).
 */
const SIZE_WORDS = new Set(["large", "small", "medium", "jumbo", "big"]);

/**
 * Grouping key for aggregating the same ingredient across recipes (shopping
 * list). Unlike `covers`, this is exact-match, not subset — "onion" and
 * "green onion" must stay separate items you'd buy independently, even
 * though `covers` treats them as interchangeable for fridge search.
 */
export function canonicalKey(item: string): string {
  const all = tokens(item);
  const stripped = all.filter((t) => !SIZE_WORDS.has(t));
  // Don't let an item named only by its size vanish entirely.
  return (stripped.length > 0 ? stripped : all).join(" ");
}

/** Does `have` (a fridge/pantry term) cover `need` (an ingredient line item)? */
export function covers(have: string, need: string): boolean {
  const haveTokens = tokens(have);
  const needTokens = tokens(need);
  if (haveTokens.length === 0 || needTokens.length === 0) return false;

  // Every token of the shorter term must appear in the longer one, so
  // "chicken" ⊂ "boneless chicken thigh" and "green onion" ⊂ "onion"… no —
  // direction matters: what we HAVE must be an ingredient of what we NEED
  // or vice versa. Require all have-tokens in need-tokens, or all
  // need-tokens in have-tokens.
  const needSet = new Set(needTokens);
  const haveSet = new Set(haveTokens);
  return (
    haveTokens.every((t) => needSet.has(t)) ||
    needTokens.every((t) => haveSet.has(t))
  );
}

export type MatchResult = {
  /** Every ingredient covered by fridge + pantry. */
  canMake: boolean;
  /** Ingredient items not covered (why it doesn't qualify). */
  missing: string[];
};

export function matchRecipe(
  ingredientItems: string[],
  fridge: string[],
  pantry: string[],
): MatchResult {
  const available = [...fridge, ...pantry].filter((s) => s.trim());
  const missing = ingredientItems.filter(
    (item) => !available.some((have) => covers(have, item)),
  );
  return { canMake: missing.length === 0, missing };
}
