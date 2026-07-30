/** Categories every new pantry starts with; all are removable, and more can
 *  be added from the pantry page. */
export const DEFAULT_CATEGORIES = [
  "Fats & oils",
  "Seasonings & spices",
  "Grains & pasta",
  "Sauces & condiments",
  "Canned & jarred",
  "Baking",
  "Other",
];

export const UNCATEGORIZED_LABEL = "Uncategorized";

/**
 * Typical empty-container weight, in grams, by pantry category.
 *
 * Staples get weighed in their packaging — nobody decants chia seeds to check
 * the level — so an on-hand figure always overstates the food itself. These
 * allowances are subtracted before deciding whether a week runs you out.
 *
 * Real containers vary a lot (a glass spice jar can outweigh the spice in
 * it), so these lean generous: an unnecessary jar of cumin is a much smaller
 * problem than running dry halfway through a prep day.
 */
const PACKAGING_TARE_G: Record<string, number> = {
  "seasonings & spices": 45, // glass jars 60-150g, plastic 15-30g
  "canned & jarred": 70, // steel can ~65g
  "sauces & condiments": 60, // squeeze bottle ~40g, glass jar much more
  "fats & oils": 40, // plastic bottle 30-50g
  "grains & pasta": 20, // bag ~10g, box ~25g
  baking: 20, // paper bags 15-25g
};

const DEFAULT_TARE_G = 25;

/** Packaging allowance for a staple in the given category. */
export function packagingTare(categoryName: string | null): number {
  if (!categoryName) return DEFAULT_TARE_G;
  return PACKAGING_TARE_G[categoryName.trim().toLowerCase()] ?? DEFAULT_TARE_G;
}
