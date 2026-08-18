import "server-only";

import { headers } from "next/headers";

/**
 * The origin this request arrived on, for building links that come back here.
 *
 * Password-reset emails have to point at a real absolute URL, and it differs
 * per environment — localhost in dev, the Vercel domain in production. Read
 * from the request rather than hard-coded so both work without configuration;
 * NEXT_PUBLIC_SITE_URL overrides it when the app sits behind a proxy that
 * rewrites the host.
 */
export async function siteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
