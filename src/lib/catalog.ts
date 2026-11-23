import { db } from "./db"

/** Public catalog of one shop. Every query here is shop-scoped. */
export async function activeCategories(shopId: string) {
  return db.serviceCategory.findMany({
    where: { shopId, active: true },
    orderBy: { sort: "asc" },
    include: { offerings: { where: { active: true }, orderBy: { sort: "asc" } } },
  })
}

export async function categoryBySlug(shopId: string, slug: string) {
  return db.serviceCategory.findFirst({
    where: { shopId, slug, active: true },
    include: { offerings: { where: { active: true }, orderBy: { sort: "asc" } } },
  })
}

export async function activeAreas(shopId: string) {
  return db.serviceArea.findMany({ where: { shopId, active: true }, orderBy: { sort: "asc" } })
}

export async function publishedReviews(shopId: string, take = 6) {
  return db.bookingReview.findMany({
    where: { published: true, rating: { gte: 4 }, booking: { shopId } },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      customer: { select: { name: true } },
      booking: { select: { offering: { select: { name: true, nameBn: true } }, area: { select: { name: true, nameBn: true } } } },
    },
  })
}

/** FAQs are shared by every shop. */
export async function activeFaqs() {
  return db.faq.findMany({ where: { active: true }, orderBy: { sort: "asc" } })
}

/** Lowest "from" price in a category, for the grid cards. */
/**
 * The one-line price hint on a category card. Marketplace flows have no
 * price on the category itself (rooms, vehicles and products carry their own).
 */
export function categoryPriceLine(c: { flow: string; offerings: Array<{ price: number; pricing: string }> }, locale: "bn" | "en", taka: (n: number, l: "bn" | "en") => string, unit: (p: string, l: "bn" | "en") => string) {
  const bn = locale === "bn"
  if (c.flow === "STAY") return bn ? "রাতপ্রতি দাম, রুম অনুযায়ী" : "Per night, by room"
  if (c.flow === "SHOP") return bn ? "পণ্য অনুযায়ী দাম, সারা দেশে ডেলিভারি" : "Priced per product, delivered nationwide"
  const from = fromPrice(c.offerings)
  const cheapest = from ? c.offerings.find((o) => o.price === from) : undefined
  if (c.flow === "RENTAL") return from && cheapest ? (bn ? `${taka(from, locale)}/${unit(cheapest.pricing, locale)} থেকে` : `From ${taka(from, locale)}/${unit(cheapest.pricing, locale)}`) : bn ? "গাড়ি অনুযায়ী ভাড়া" : "Rates per vehicle"
  if (from && cheapest) return bn ? `শুরু ${taka(from, locale)}/${unit(cheapest.pricing, locale)}` : `From ${taka(from, locale)}/${unit(cheapest.pricing, locale)}`
  return bn ? "দেখে দাম" : "Quote after visit"
}

export function fromPrice(offerings: Array<{ price: number; pricing: string }>) {
  const priced = offerings.filter((o) => o.pricing !== "QUOTE" && o.price > 0)
  if (!priced.length) return null
  return Math.min(...priced.map((o) => o.price))
}
