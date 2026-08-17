import type { NextConfig } from "next";

/**
 * Response headers applied to every route.
 *
 * The app is a public URL with other people's accounts on it, so these close
 * the browser-side gaps that Row Level Security can't: a page framed by
 * someone else's site to harvest clicks, a referrer header leaking a recipe
 * URL to a third party, a served file being sniffed as something executable.
 */
const securityHeaders = [
  // No framing at all — nothing in the app is meant to be embedded.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin but not the path when leaving the site, so a shared
  // recipe link never travels in a Referer header to somewhere else.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here needs any of these; deny them rather than rely on prompts.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // HTTPS only, remembered for a year. Vercel serves HTTPS already; this
  // stops the first request of a later visit from going out in the clear.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions reject requests whose Origin doesn't match the server's
    // Host (CSRF protection). VS Code dev tunnels forward a *.devtunnels.ms
    // host, so allow-list it for viewing the app through a tunnel in dev.
    serverActions: {
      allowedOrigins: ["*.devtunnels.ms"],
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
