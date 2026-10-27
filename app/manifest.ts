import type { MetadataRoute } from "next";

// Lets readers install Buraaq Times as an app (needed on iPhone/iPad for
// notifications: Share → Add to Home Screen).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Buraaq Times",
    short_name: "Buraaq Times",
    description: "News, articles and perspectives from Buraaq Times.",
    start_url: "/?utm_source=homescreen",
    scope: "/",
    display: "standalone",
    background_color: "#080B12",
    theme_color: "#080B12",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
