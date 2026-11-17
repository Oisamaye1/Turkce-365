import type { MetadataRoute } from "next";

/** Makes the site installable: home-screen icon, full-screen window, splash colours, shortcuts. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Türkçe 365",
    short_name: "Türkçe 365",
    description: "Your personal Turkish tutor: a day-by-day plan from zero to real conversations.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "en",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", short_name: "Today", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Reviews", short_name: "Reviews", url: "/review", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My plan", short_name: "Plan", url: "/plan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Write", short_name: "Write", url: "/write", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
