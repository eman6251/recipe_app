"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// What Claude extracts from a pasted caption. Mirrors RecipePayload plus
// per-ingredient gram estimates (feeds the USDA macro phase later).
const ParsedIngredient = z.object({
  group_name: z
    .string()
    .nullable()
    .describe('Section header like "For the sauce", or null if ungrouped'),
  quantity: z.number().nullable().describe("Numeric amount; null for 'to taste'"),
  unit: z
    .string()
    .nullable()
    .describe("Unit like tbsp, cup, g, oz, clove, bunch; null for count items"),
  item: z.string().describe("The ingredient itself, e.g. 'olive oil'"),
  note: z.string().nullable().describe("Prep note like 'finely chopped'"),
  grams: z
    .number()
    .nullable()
    .describe(
      "Best-estimate total weight in grams for this line at the stated quantity, for nutrition math. null only if truly unestimable",
    ),
});

const ParsedRecipe = z.object({
  title: z.string().describe("Short recipe title in title case"),
  description: z.string().nullable().describe("One-sentence description"),
  servings: z
    .number()
    .describe("Number of servings; estimate from quantities if not stated"),
  prep_minutes: z.number().nullable(),
  cook_minutes: z.number().nullable(),
  instructions: z
    .array(z.string())
    .describe("Ordered steps, one imperative sentence or two per step"),
  tags: z
    .array(z.string())
    .describe(
      [
        "Lowercase tags, most specific first. Include, in order:",
        "1. Meal type — exactly one of: breakfast, lunch, dinner, dessert, snack, side dish (best guess if unclear).",
        "2. Any diet labels the ingredients clearly support: vegetarian, vegan, dairy-free, gluten-free, high-protein, low-carb. Only include one when the recipe genuinely qualifies — a dish with butter is not dairy-free.",
        "3. Any equipment that defines how it's cooked: one pot, sheet pan, slow cooker, instant pot, air fryer, grill, no cook.",
        "4. 'easy' for genuinely simple weeknight recipes, and 'meal prep' if it's clearly designed to batch and reheat.",
        "5. Then 2-3 descriptive tags like 'chicken', 'thai', 'noodles'.",
      ].join(" "),
    ),
  notes: z
    .string()
    .nullable()
    .describe("Tips, substitutions, or storage advice from the caption"),
  source_note: z
    .string()
    .nullable()
    .describe("Creator attribution if present, e.g. '@handle on TikTok'"),
  ingredients: z.array(ParsedIngredient),
});

export type ParsedRecipeDraft = z.infer<typeof ParsedRecipe>;

const SYSTEM_PROMPT = `You convert social-media recipe captions (TikTok/Instagram/YouTube) into structured recipe data.

Rules:
- Extract only what the caption supports; never invent ingredients or steps. Light inference is fine (e.g. an obvious unstated step like "serve").
- Ingredient lines must be split into quantity / unit / item / prep-note. Convert fractions to decimals (1/2 → 0.5).
- Estimate grams per ingredient line using common culinary weights (1 tbsp olive oil ≈ 13.5g, 1 cup flour ≈ 120g, 1 medium onion ≈ 110g, 1 clove garlic ≈ 5g, etc.). This feeds nutrition math, so give your best estimate rather than null.
- If servings aren't stated, estimate from total quantities.
- Steps should be concise and imperative. Split run-on caption text into proper steps.
- Ignore hashtags, follow-me boilerplate, and emoji spam — but capture genuine tips into notes.`;

export type ParseResult =
  | { draft: ParsedRecipeDraft; sourceUrl?: string }
  | { error: string };

const TIKTOK_URL = /^https?:\/\/([\w-]+\.)*tiktok\.com\//i;
const INSTAGRAM_URL = /^https?:\/\/([\w-]+\.)*instagram\.com\//i;

/**
 * Pull a TikTok caption from its public oEmbed endpoint, which returns the
 * caption as `title` and needs no API key.
 *
 * Instagram has no equivalent: its oEmbed requires a Facebook app token and
 * omits captions entirely, so those still have to be pasted by hand.
 */
async function fetchTikTokCaption(
  url: string,
): Promise<{ caption: string; author: string } | { error: string }> {
  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return {
        error:
          "Couldn't read that TikTok — it may be private or removed. Paste the caption text instead.",
      };
    }
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      author_url?: string;
    };
    const caption = (data.title ?? "").trim();
    if (!caption) {
      return {
        error:
          "That TikTok has no caption to read. Paste the recipe text instead.",
      };
    }
    return { caption, author: data.author_name ?? "" };
  } catch {
    return { error: "Couldn't reach TikTok. Paste the caption text instead." };
  }
}

export async function parseCaption(caption: string): Promise<ParseResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error:
        "No ANTHROPIC_API_KEY set. Add it to .env.local (console.anthropic.com → API keys), restart the dev server, and try again.",
    };
  }

  let text = caption.trim();
  let sourceUrl: string | undefined;
  let author = "";

  if (INSTAGRAM_URL.test(text)) {
    return {
      error:
        "Instagram doesn't allow reading captions from a link. Open the post, copy its caption, and paste that here.",
    };
  }

  if (TIKTOK_URL.test(text)) {
    const fetched = await fetchTikTokCaption(text);
    if ("error" in fetched) return fetched;
    sourceUrl = text;
    author = fetched.author;
    text = fetched.caption;
  }

  if (text.length < 20) {
    return { error: "That looks too short to be a recipe — paste the full caption." };
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Parse this recipe caption into structured data:\n\n${text}`,
        },
      ],
      output_config: { format: zodOutputFormat(ParsedRecipe) },
    });

    if (!response.parsed_output) {
      return { error: "Claude couldn't produce a valid recipe from that text. Try cleaning up the caption and re-pasting." };
    }

    const draft = response.parsed_output;
    // Credit the creator when the link told us who they are.
    if (author && !draft.source_note) draft.source_note = `@${author} on TikTok`;
    return { draft, sourceUrl };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { error: "Anthropic API key is invalid — double-check ANTHROPIC_API_KEY in .env.local." };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { error: "Rate limited by the Anthropic API — wait a moment and try again." };
    }
    if (err instanceof Anthropic.APIError) {
      return { error: `Anthropic API error (${err.status}): ${err.message}` };
    }
    throw err;
  }
}
