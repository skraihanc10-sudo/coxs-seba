import { cookies } from "next/headers"
import { db } from "./db"
import { AppError } from "./errors"

/** Customer-side: which shop the visitor is browsing (cookie holds the slug). */
export const SHOP_COOKIE = "nc_shop"
/** Owner-side: which shop the owner is currently working in inside the office panels. */
export const OFFICE_SHOP_COOKIE = "nc_office_shop"

export const shopSelect = {
  id: true,
  slug: true,
  name: true,
  nameBn: true,
  city: true,
  cityBn: true,
  kind: true,
  phone: true,
  whatsapp: true,
  email: true,
  address: true,
  addressBn: true,
  blurb: true,
  blurbBn: true,
  active: true,
  sort: true,
} as const

export type ShopInfo = {
  id: string
  slug: string
  name: string
  nameBn: string
  city: string
  cityBn: string
  kind: string
  phone: string
  whatsapp: string
  email: string
  address: string
  addressBn: string
  blurb: string
  blurbBn: string
  active: boolean
  sort: number
}

export async function activeShops(): Promise<ShopInfo[]> {
  return db.shop.findMany({ where: { active: true }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }], select: shopSelect })
}

export async function allShops(): Promise<ShopInfo[]> {
  return db.shop.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "asc" }], select: shopSelect })
}

export async function shopBySlug(slug: string): Promise<ShopInfo | null> {
  if (!slug) return null
  return db.shop.findFirst({ where: { slug, active: true }, select: shopSelect })
}

export async function shopById(id: string): Promise<ShopInfo | null> {
  if (!id) return null
  return db.shop.findUnique({ where: { id }, select: shopSelect })
}

/**
 * The shop a visitor is browsing: the cookie if it points at an active shop,
 * otherwise the first active shop. Public pages and the booking wizard use this.
 */
export async function currentShop(): Promise<ShopInfo> {
  const slug = (await cookies()).get(SHOP_COOKIE)?.value ?? ""
  const picked = slug ? await shopBySlug(slug) : null
  if (picked) return picked
  const first = (await activeShops())[0]
  if (!first) throw new AppError("এখনো কোনো শপ চালু নেই।", "No shop is open yet.")
  return first
}

type Staff = { role: string; shopId?: string | null }

/**
 * The shop an office user is working in. Shop staff are pinned to their own
 * shop; the owner picks one from the switcher (cookie) and defaults to the first.
 */
export async function officeShop(user: Staff): Promise<ShopInfo> {
  if (user.role !== "OWNER") {
    const own = user.shopId ? await shopById(user.shopId) : null
    if (!own) throw new AppError("আপনার অ্যাকাউন্ট কোনো শপে যুক্ত নেই। মালিককে বলুন।", "Your account is not attached to a shop. Ask the owner.")
    return own
  }
  const id = (await cookies()).get(OFFICE_SHOP_COOKIE)?.value ?? ""
  const picked = id ? await shopById(id) : null
  if (picked) return picked
  const first = (await allShops())[0]
  if (!first) throw new AppError("আগে একটা শপ তৈরি করুন।", "Create a shop first.")
  return first
}

/** Shop id for an office user, for `where` clauses. */
export async function officeShopId(user: Staff) {
  return (await officeShop(user)).id
}

export { staffCanSee } from "./shops-shared"

/** "কক্সবাজার সদর" / "Cox's Bazar Sadar" style coverage line. */
export function coverageText(shop: { cityBn: string; city: string }, locale: "bn" | "en") {
  return locale === "bn" ? `${shop.cityBn} · সারা দেশে ডেলিভারি` : `${shop.city} · nationwide delivery`
}

export function outsideMessage(shop: { cityBn: string; city: string }) {
  return new AppError(`এই মুহূর্তে আমরা শুধু ${shop.cityBn} এলাকায় সেবা দিচ্ছি।`, `Right now we only serve ${shop.city}.`)
}
