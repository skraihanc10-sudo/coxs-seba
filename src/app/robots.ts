import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/support", "/worker", "/bookings", "/care", "/profile", "/notifications", "/help/tickets", "/api", "/login"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
