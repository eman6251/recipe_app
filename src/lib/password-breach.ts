import "server-only";

import { createHash } from "node:crypto";

/**
 * Reject passwords that appear in known breaches.
 *
 * This is what Supabase's paid leaked-password protection does, and the
 * service behind it is free: Have I Been Pwned's Pwned Passwords range API,
 * no key required. It matters because the shape rules can't catch the real
 * failure mode — "Password123!" has twelve characters, a digit and a symbol,
 * and sits in every breach list there is.
 *
 * The password itself never leaves this server. Only the first five hex
 * characters of its SHA-1 go out; HIBP returns every hash suffix sharing that
 * prefix (~800 of them) and the comparison happens here. That's k-anonymity:
 * the request narrows the field to a few hundred candidates and reveals
 * nothing about which one — if any — was being asked about.
 */

/**
 * Common passwords that still satisfy the shape rules, checked before the
 * network call so the obvious cases don't depend on a third party being up.
 */
const COMMON_PASSWORDS = new Set([
  "password123!",
  "password1234",
  "password@123",
  "passw0rd123!",
  "qwerty123456",
  "qwerty123456!",
  "iloveyou123!",
  "letmein12345",
  "welcome123!!",
  "admin123456!",
  "abc123456789",
  "123456789012",
  "skillet1234!",
]);

/** How long to wait on HIBP before giving up and allowing the password. */
const TIMEOUT_MS = 2500;

export async function isBreachedPassword(password: string): Promise<boolean> {
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return true;

  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        // Pads the response with random decoy hashes, so its size can't hint
        // at how many matches the prefix had.
        headers: { "Add-Padding": "true" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      },
    );
    if (!response.ok) return false;

    const body = await response.text();
    for (const line of body.split("\n")) {
      const [candidate, countRaw] = line.trim().split(":");
      // Padding entries are returned with a count of 0.
      if (candidate === suffix && Number(countRaw) > 0) return true;
    }
    return false;
  } catch {
    // HIBP down or slow: let the signup through. Blocking account creation
    // on a third party's uptime trades a real outage for a marginal risk.
    return false;
  }
}
