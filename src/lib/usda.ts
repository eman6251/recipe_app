import type { Macros } from "@/lib/types";

/**
 * USDA FoodData Central client (server-side only — needs USDA_API_KEY).
 * We search Foundation + SR Legacy datasets (lab-measured, per-100g values)
 * and extract the four macros we track.
 */

// FDC nutrient ids
const KCAL = [1008, 2047, 2048]; // Energy; Atwater variants as fallbacks
const PROTEIN = 1003;
const FAT = 1004;
const CARBS = 1005;

type FdcNutrient = {
  nutrientId: number;
  value: number; // per 100g
  unitName?: string;
};

type FdcFood = {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: FdcNutrient[];
};

export type UsdaMatch = {
  fdc_id: number;
  description: string;
  per_100g: Macros;
};

function extractMacros(food: FdcFood): Macros | null {
  const byId = new Map(food.foodNutrients.map((n) => [n.nutrientId, n.value]));

  const kcalId = KCAL.find((id) => byId.get(id) != null);
  const protein = byId.get(PROTEIN);
  const fat = byId.get(FAT);
  const carbs = byId.get(CARBS);

  if (kcalId == null || protein == null || fat == null || carbs == null) {
    return null;
  }

  return {
    kcal: byId.get(kcalId)!,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
  };
}

export class UsdaAuthError extends Error {}

// Foundation + SR Legacy are lab-measured but miss many everyday items
// ("Chocolate chips" only exists in the survey set). Branded is noisier and
// only worth searching when nothing else turns up.
// Lab-measured base ingredients ("Crustaceans, shrimp, raw") and everyday
// composite foods ("Chocolate chips") live in different datasets and rank
// against each other badly in one query — searched together, survey dishes
// crowd raw ingredients out entirely. Query them separately and merge.
const LAB_DATATYPES = ["Foundation", "SR Legacy"];
const SURVEY_DATATYPES = ["Survey (FNDDS)"];
const BRANDED_DATATYPES = ["Branded"];

async function fetchCandidates(
  query: string,
  apiKey: string,
  dataType: string[],
): Promise<UsdaMatch[]> {
  // POST rather than GET: the query-string form intermittently gets a 400 from
  // FDC's edge proxy when spaces are +-encoded in both query and dataType.
  // The JSON body sidesteps URL encoding entirely.
  const send = () =>
    fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey.trim())}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, dataType, pageSize: 8 }),
        cache: "no-store",
      },
    );

  // One retry so a blip doesn't drop an ingredient from the whole computation.
  let res = await send();
  if (!res.ok && res.status !== 403 && res.status !== 429) {
    await new Promise((r) => setTimeout(r, 400));
    res = await send();
  }

  if (res.status === 403) {
    throw new UsdaAuthError("USDA API rejected the key (403).");
  }
  if (!res.ok) {
    throw new Error(`USDA search failed (${res.status})`);
  }

  const data = (await res.json()) as { foods?: FdcFood[] };
  const out: UsdaMatch[] = [];
  for (const food of data.foods ?? []) {
    const per_100g = extractMacros(food);
    if (per_100g) {
      out.push({ fdc_id: food.fdcId, description: food.description, per_100g });
    }
  }
  return out;
}

/** True if some candidate's description contains every token of `phrase`. */
function covers(candidates: UsdaMatch[], phrase: string): boolean {
  const tokens = phrase.split(" ");
  return candidates.some((c) => {
    const desc = c.description.toLowerCase();
    return tokens.every((t) => desc.includes(t));
  });
}

/** Search FDC for an ingredient; return all candidates with complete macros. */
export async function searchUsdaCandidates(
  query: string,
  apiKey: string,
): Promise<UsdaMatch[]> {
  const tokens = query.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const full = tokens.join(" ");
  // English noun phrases put the head noun last, so the final two tokens are
  // the ingredient itself with its modifiers stripped.
  const headPhrase = tokens.length > 2 ? tokens.slice(-2).join(" ") : null;

  const byId = new Map<number, UsdaMatch>();
  const add = (ms: UsdaMatch[]) => ms.forEach((m) => byId.set(m.fdc_id, m));

  const searchBoth = async (q: string) => {
    const [lab, survey] = await Promise.all([
      fetchCandidates(q, apiKey, LAB_DATATYPES),
      fetchCandidates(q, apiKey, SURVEY_DATATYPES),
    ]);
    add(lab);
    add(survey);
  };

  await searchBoth(full);

  // USDA ranks loosely and can drop the head noun entirely: "low fat cottage
  // cheese" returns cream/monterey/swiss and no cottage cheese at all. When
  // that happens, search the head phrase on its own.
  if (headPhrase && !covers([...byId.values()], headPhrase)) {
    await searchBoth(headPhrase);
  }

  // Specialty products (palm sugar, stevia-sweetened chips, protein powders)
  // often exist only as branded entries.
  if (!covers([...byId.values()], full)) {
    add(await fetchCandidates(full, apiKey, BRANDED_DATATYPES));
  }

  return [...byId.values()];
}

/**
 * Heuristic candidate pick — fallback when Claude isn't available. USDA
 * search ranking alone is unreliable ("olive oil" → "Anchovies, canned in
 * olive oil"). Descriptions are comma-inverted ("Oil, olive, extra virgin"),
 * so a head-noun match is the strongest signal.
 */
export function pickBestLocal(
  query: string,
  candidates: UsdaMatch[],
): UsdaMatch | null {
  const queryTokens = query.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const queryCooked = queryTokens.includes("cooked");

  let best: { match: UsdaMatch; score: number } | null = null;
  for (const match of candidates) {
    const desc = match.description.toLowerCase();
    const descTokens = desc.split(/[^a-z]+/).filter(Boolean);
    const head = desc.split(",")[0].trim();

    let score = 0;
    if (queryTokens.some((t) => head === t || head.startsWith(t))) score += 3;
    score += queryTokens.filter((t) => descTokens.includes(t)).length;
    score -= descTokens.length * 0.1; // prefer simpler foods
    if (desc.includes("raw")) score += 0.3; // base ingredient over prepared

    // Recipe grams describe the as-purchased state (dry noodles, raw meat);
    // "cooked" nutrient data against dry grams undercounts up to 3×.
    if (!queryCooked) {
      if (descTokens.includes("cooked")) score -= 2;
      if (descTokens.includes("dry") || descTokens.includes("dried")) score += 0.3;
    }

    if (!best || score > best.score) best = { match, score };
  }
  return best?.match ?? null;
}

export function scaleMacros(per100g: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: per100g.kcal * f,
    protein_g: per100g.protein_g * f,
    carbs_g: per100g.carbs_g * f,
    fat_g: per100g.fat_g * f,
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
  };
}

export function roundMacros(m: Macros): Macros {
  const r = (n: number) => Math.round(n * 10) / 10;
  return { kcal: r(m.kcal), protein_g: r(m.protein_g), carbs_g: r(m.carbs_g), fat_g: r(m.fat_g) };
}
