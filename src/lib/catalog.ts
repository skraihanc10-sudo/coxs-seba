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
export function fromPrice(offerings: Array<{ price: number; pricing: string }>) {
  const priced = offerings.filter((o) => o.pricing !== "QUOTE" && o.price > 0)
  if (!priced.length) return null
  return Math.min(...priced.map((o) => o.price))
}
