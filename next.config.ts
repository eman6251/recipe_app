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
  /*
   * Recipe photos come off phones at two megabytes each and were being served
   * whole to fill a card thumbnail a hundred and fifty pixels wide. A grid of
   * twelve was twenty-four megabytes of mobile data to draw a page that needs
   * well under one.
   *
   * Pointing the optimiser at the storage buckets lets it resize and re-encode
   * on the way through, so each <Image> gets something scaled to the box it
   * renders in. The sizes attributes at each call site are what make that
   * work — without them every image is treated as full-viewport-width.
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Modern formats first; the optimiser falls back for browsers that
    // can't take them.
    formats: ["image/avif", "image/webp"],
  },
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
