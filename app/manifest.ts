import type { MetadataRoute } from "next";

// Dark navy, the app's dark background: shown on the splash screen and behind the icon
const BG = "#0b0f19";

/**
 * Makes CalDef installable ("Add to Home Screen" on phones, "Install app" on desktop Chrome/Edge).
 * The shortcuts appear on long-press / right-click of the installed icon; /?action=... is handled in quick-fab.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CalDef Tracker",
    short_name: "CalDef",
    description: "Calorie, macro and fasting tracker with AI meal estimates and pantry recipes",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BG,
    theme_color: BG,
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Log a meal", short_name: "Log meal", url: "/?action=log-meal", icons: [{ src: "/icons/192", sizes: "192x192", type: "image/png" }] },
      { name: "Log weight", short_name: "Weight", url: "/?action=log-weight", icons: [{ src: "/icons/192", sizes: "192x192", type: "image/png" }] },
      { name: "Fasting timer", short_name: "Fasting", url: "/?action=fasting", icons: [{ src: "/icons/192", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
