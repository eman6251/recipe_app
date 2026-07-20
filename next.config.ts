import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions reject requests whose Origin doesn't match the server's
    // Host (CSRF protection). VS Code dev tunnels forward a *.devtunnels.ms
    // host, so allow-list it for viewing the app through a tunnel in dev.
    serverActions: {
      allowedOrigins: ["*.devtunnels.ms"],
    },
  },
};

export default nextConfig;
