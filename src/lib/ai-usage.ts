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
 * USD per million tokens. Check these against the current price list when
 * changing models — they're only used to enforce the daily cap, so being
 * out of date makes the cap wrong rather than breaking anything.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 3, output: 15 },
};
const FALLBACK_PRICE = { input: 3, output: 15 };

/** Per user, per rolling 24 hours. Roughly 45 recipe imports. */
export const DAILY_BUDGET_USD = 1;

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = PRICING[model] ?? FALLBACK_PRICE;
  return (
    (inputTokens * price.input + outputTokens * price.output) / 1_000_000
  );
}

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

export type BudgetCheck = {
  allowed: boolean;
  spentUsd: number;
  /** Ready-to-show reason, set only when the call should be refused. */
  error?: string;
};

/**
 * Whether this user has room in their daily AI budget.
 *
 * The app's Anthropic key is the owner's, so an account that hammers the
 * importer spends someone else's money. A rolling 24-hour window rather than
 * a calendar day, so the cap can't be doubled by straddling midnight.
 *
 * Call this before starting a request, not after — the point is to not make
 * the call. Fails open: if the check itself errors, the feature still works,
 * because a broken meter shouldn't take the app down with it.
 */
export async function checkAiBudget(): Promise<BudgetCheck> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { allowed: false, spentUsd: 0, error: "Sign in first." };

    // The owner pays the bill either way, and being locked out of your own
    // app by your own cap helps nobody.
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin) return { allowed: true, spentUsd: 0 };

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // RLS scopes this to the caller's own rows.
    const { data, error } = await supabase
      .from("ai_usage")
      .select("model, input_tokens, output_tokens")
      .gte("created_at", since);

    if (error) return { allowed: true, spentUsd: 0 };

    const spentUsd = (data ?? []).reduce(
      (sum, row) =>
        sum +
        estimateCostUsd(row.model, row.input_tokens ?? 0, row.output_tokens ?? 0),
      0,
    );

    if (spentUsd >= DAILY_BUDGET_USD) {
      return {
        allowed: false,
        spentUsd,
        error:
          "You've hit the daily limit for AI features. It's a rolling 24-hour window, so try again in a few hours — everything else in the app still works.",
      };
    }

    return { allowed: true, spentUsd };
  } catch {
    return { allowed: true, spentUsd: 0 };
  }
}
