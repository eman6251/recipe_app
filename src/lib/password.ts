/**
 * Password rules for new accounts.
 *
 * Row Level Security keeps one account out of another's data perfectly, and
 * none of it matters if the password is "recipes1". This is the one part of
 * the app's security that users choose for themselves, so the floor is set
 * here rather than left to Supabase's 6-character default.
 *
 * Shared by the sign-up form and the server action that trusts nothing from
 * it — the browser check is a courtesy, the server check is the rule.
 */

export const MIN_PASSWORD_LENGTH = 12;

export const PASSWORD_HINT =
  "At least 12 characters, including a number and a symbol.";

/**
 * Null when the password is acceptable, otherwise the reason it isn't.
 *
 * Shape only — whether the password has also been breached is a separate,
 * asynchronous question (see password-breach.ts).
 */
export function validatePassword(
  password: string,
  /** Identifiers the password shouldn't just repeat back. */
  context: { username?: string; email?: string } = {},
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/\d/.test(password)) {
    return "Passwords need at least one number.";
  }
  // Anything that isn't a letter, a digit, or whitespace.
  if (!/[^\p{L}\p{N}\s]/u.test(password)) {
    return "Passwords need at least one symbol, like ! ? # or -.";
  }

  // A password built out of the username is public knowledge with punctuation
  // on the end — and the username is on every recipe you share.
  const lower = password.toLowerCase();
  const parts = [context.username, context.email?.split("@")[0]]
    .filter((p): p is string => !!p && p.length >= 4)
    .map((p) => p.toLowerCase());
  if (parts.some((p) => lower.includes(p))) {
    return "Passwords can't contain your username or email.";
  }

  return null;
}
