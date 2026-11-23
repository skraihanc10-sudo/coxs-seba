import type { MetadataRoute } from "next"
import { brand } from "@/theme/brand"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} · ${brand.taglineBn}`,
    short_name: brand.nameBn,
    description: `${brand.taglineBn} · ${brand.tagline}`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f7fb",
    theme_color: "#1259e8",
    lang: "bn",
    categories: ["lifestyle", "utilities", "travel"],
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
