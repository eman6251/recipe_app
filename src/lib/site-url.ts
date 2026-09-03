import "server-only";

import { headers } from "next/headers";

/**
 * The origin that emailed links should point back to.
 *
 * Deliberately *not* just the current request's host. A password-reset link is
 * read somewhere else entirely — usually on a phone, hours later — so the one
 * host it must never carry is the one that happened to generate it. Asking for
 * a reset from `npm run dev` would otherwise email a localhost:3000 link that
 * can only work on the machine that asked.
 *
 * Order of preference:
 *  1. NEXT_PUBLIC_SITE_URL — set it and this is settled everywhere.
 *  2. Vercel's production domain, which every deployment knows, including
 *     previews. A preview build still emails links to the real site.
 *  3. The request host, which is the right answer for purely local work.
 *
 * Whatever this returns still has to be in the Supabase dashboard's Redirect
 * URLs allow list. Supabase silently falls back to the project's Site URL for
 * anything not on it — and that setting defaults to localhost:3000, which is
 * exactly what a wrong-looking reset link is telling you.
 */
export async function siteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return stripSlash(withProtocol(configured));

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return stripSlash(withProtocol(vercel));

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Vercel's variable is a bare hostname; a hand-set one usually isn't. */
function withProtocol(value: string): string {
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

function stripSlash(value: string): string {
  return value.replace(/\/$/, "");
}
