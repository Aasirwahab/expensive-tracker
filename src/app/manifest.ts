import type { MetadataRoute } from "next";

// Web app manifest — makes ShopLedger installable ("Add to Home Screen") and
// open full-screen like a native app. Icons are generated at /icon-192 and
// /icon-512 (see those route handlers).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShopLedger",
    short_name: "ShopLedger",
    description: "Record sales, expenses, stock, and profit in seconds.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0E7C4A",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
