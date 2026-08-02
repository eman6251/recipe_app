import type { MetadataRoute } from "next";

/**
 * Makes the app installable to a phone home screen: standalone display drops
 * the browser chrome, which matters most on the shopping list in a store.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Skillet — Recipes & Meal Prep",
    short_name: "Skillet",
    description:
      "Personal recipe box, meal planner, macro tracker, and smart shopping list.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1a1c",
    theme_color: "#1a1a1c",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
