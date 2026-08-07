import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AiFeature =
  | "import"
  | "macro_grams"
  | "macro_match"
  | "ingredient_alias";

type UsageLike = {
  input_tokens?: number | null;
  output_tokens?: number | null;
};

/**
 * Record an Anthropic call against the user who triggered it.
 *
 * Every AI feature bills to the app owner's key whoever runs it, so this is
 * what makes per-user spend visible. Best-effort by design: a logging failure
 * must never break the feature the user actually asked for.
 */
export async function logAiUsage(
  feature: AiFeature,
  model: string,
  usage: UsageLike | null | undefined,
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("ai_usage").insert({
      feature,
      model,
      input_tokens: usage?.input_tokens ?? 0,
      output_tokens: usage?.output_tokens ?? 0,
    });
  } catch {
    // ignored
  }
}
