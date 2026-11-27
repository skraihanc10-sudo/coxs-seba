import type { MetadataRoute } from "next"
import { db } from "@/lib/db"
import { absoluteUrl } from "@/lib/seo"

export const dynamic = "force-dynamic"

/**
 * Static pages, every branch page, and the catalog of the first active shop.
 * Catalog paths (/services/[slug], /book/[cat]/[offer]) are shop-agnostic:
 * the page shows them for whichever branch the visitor has picked.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/services"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/services/cleaning"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/how-it-works"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/help"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/partner"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ]

  try {
    const shops = await db.shop.findMany({ where: { active: true }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }], select: { id: true, slug: true } })
    const first = shops[0]
    if (first) {
      const categories = await db.serviceCategory.findMany({
        where: { shopId: first.id, active: true },
        orderBy: { sort: "asc" },
        select: { slug: true, offerings: { where: { active: true }, orderBy: { sort: "asc" }, select: { slug: true } } },
      })
      for (const c of categories) {
        entries.push({ url: absoluteUrl(`/services/${c.slug}`), lastModified: now, changeFrequency: "weekly", priority: 0.8 })
        for (const o of c.offerings) {
          entries.push({ url: absoluteUrl(`/book/${c.slug}/${o.slug}`), lastModified: now, changeFrequency: "weekly", priority: 0.6 })
        }
      }
    }
  } catch {
    // No database at build time: the static pages are still listed.
  }

  return entries
}
