import type { Prisma } from "@prisma/client"
import { db } from "./db"
import { AppError } from "./errors"
import { notify, officeIds } from "./notify"
import { localToday } from "./format"
import type { Locale } from "./format"
import { quoteCoupon } from "./coupons"
import { newCode } from "./bookings"
import { paymentProvider } from "./payments"
import { getSettings } from "./settings"

/**
 * The product shop (Cox's dried fish, pickles, chutneys…): product groups,
 * products with weight/size variants, and orders. An order is a ServiceBooking
 * of the shop category (flow SHOP) with OrderItem lines, so it rides on the
 * existing office panels, chat, payments, reports and customer order list.
 */

export const productInclude = {
  group: { select: { id: true, slug: true, name: true, nameBn: true } },
  variants: { orderBy: { sort: "asc" } },
} satisfies Prisma.ProductInclude

export type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>

export function productName(p: { name: string; nameBn: string }, locale: Locale) {
  return locale === "bn" ? p.nameBn || p.name : p.name || p.nameBn
}

/** Price range of a product's active variants: [min, max]. */
export function priceRange(p: { variants: Array<{ price: number; active: boolean }> }) {
  const prices = p.variants.filter((v) => v.active).map((v) => v.price)
  return prices.length ? [Math.min(...prices), Math.max(...prices)] : [0, 0]
}

/** The shop category of a shop (flow SHOP) with its single hidden offering. */
export async function shopCategory(shopId: string) {
  return db.serviceCategory.findFirst({ where: { shopId, flow: "SHOP", active: true }, include: { offerings: { where: { active: true }, orderBy: { sort: "asc" } } } })
}

export async function shopGroups(shopId: string, onlyActive = true) {
  return db.productGroup.findMany({ where: { shopId, ...(onlyActive ? { active: true } : {}) }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] })
}

/** Products customers can buy right now, in display order. */
export async function liveProducts(shopId: string) {
  return db.product.findMany({ where: { shopId, active: true, variants: { some: { active: true } } }, include: productInclude, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] })
}

export async function allProducts(shopId: string) {
  return db.product.findMany({ where: { shopId }, include: { ...productInclude, _count: { select: { items: true } } }, orderBy: [{ active: "desc" }, { sort: "asc" }, { createdAt: "asc" }] })
}

export async function productBySlug(shopId: string, slug: string) {
  return db.product.findFirst({ where: { shopId, slug, active: true }, include: productInclude })
}

/* ---------- admin writes ---------- */

export type VariantInput = { label: string; price: number; oldPrice: number; stock: number }

/** Variants one per line: `label | price | old price (optional) | stock (optional, blank = unlimited)`. */
export function parseVariants(text: string): VariantInput[] {
  const out: VariantInput[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split("|").map((p) => p.trim())
    const label = parts[0] ?? ""
    const price = Math.round(Number((parts[1] ?? "").replace(/[^\d.]/g, "")))
    const oldPrice = Math.round(Number((parts[2] ?? "0").replace(/[^\d.]/g, ""))) || 0
    const stock = parts[3] === undefined || parts[3] === "" ? -1 : Math.max(0, Math.round(Number(parts[3]) || 0))
    if (!label || !Number.isFinite(price) || price <= 0) throw new AppError(`ভ্যারিয়েন্ট লাইনটা ঠিক নেই: "${line.slice(0, 40)}"। ফরম্যাট: লেবেল | দাম | আগের দাম | স্টক`, `Bad variant line: "${line.slice(0, 40)}". Format: label | price | old price | stock`)
    out.push({ label: label.slice(0, 40), price, oldPrice, stock })
    if (out.length >= 10) break
  }
  return out
}

export function variantsText(variants: Array<{ label: string; price: number; oldPrice: number; stock: number }>) {
  return variants.map((v) => `${v.label} | ${v.price} | ${v.oldPrice || ""} | ${v.stock < 0 ? "" : v.stock}`).join("\n")
}

export function slugify(text: string) {
  const s = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return s || `p-${Date.now().toString(36)}`
}

export type ProductInput = {
  groupId: string
  name: string
  nameBn: string
  slug: string
  badge: string
  detail: string
  detailBn: string
  variants: string
  sort: number
  active: boolean
}

/** Admin creates or edits a product; variants with the same label keep their id. */
export async function saveProduct(shopId: string, id: string | undefined, input: ProductInput, photos: string[]) {
  const group = await db.productGroup.findFirst({ where: { id: input.groupId, shopId } })
  if (!group) throw new AppError("প্রোডাক্ট গ্রুপ বেছে নিন।", "Pick a product group.")
  const variants = parseVariants(input.variants)
  if (!variants.length) throw new AppError("অন্তত একটা ভ্যারিয়েন্ট (সাইজ/ওজন আর দাম) দিন।", "Add at least one variant (size/weight and price).")
  let slug = slugify(input.slug || input.name)
  const clash = await db.product.findFirst({ where: { shopId, slug, NOT: id ? { id } : undefined } })
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`
  const data = { groupId: group.id, name: input.name, nameBn: input.nameBn || input.name, slug, badge: input.badge, detail: input.detail, detailBn: input.detailBn, sort: input.sort, active: input.active }
  if (id) {
    const own = await db.product.findFirst({ where: { id, shopId }, include: { variants: true } })
    if (!own) throw new AppError("প্রোডাক্ট পাওয়া যায়নি।", "Product not found.")
    await db.product.update({ where: { id }, data: { ...data, ...(photos.length ? { photos: photos.join(",") } : {}) } })
    const keep = new Set<string>()
    for (const [i, v] of variants.entries()) {
      const same = own.variants.find((e) => e.label.toLowerCase() === v.label.toLowerCase() && !keep.has(e.id))
      if (same) {
        keep.add(same.id)
        await db.productVariant.update({ where: { id: same.id }, data: { ...v, sort: i, active: true } })
      } else {
        const created = await db.productVariant.create({ data: { ...v, productId: id, sort: i } })
        keep.add(created.id)
      }
    }
    for (const e of own.variants) if (!keep.has(e.id)) await db.productVariant.update({ where: { id: e.id }, data: { active: false } })
    return db.product.findUnique({ where: { id } })
  }
  return db.product.create({ data: { ...data, shopId, photos: photos.join(","), variants: { create: variants.map((v, i) => ({ ...v, sort: i })) } } })
}

export async function toggleProduct(shopId: string, id: string) {
  const own = await db.product.findFirst({ where: { id, shopId } })
  if (!own) throw new AppError("প্রোডাক্ট পাওয়া যায়নি।", "Product not found.")
  return db.product.update({ where: { id }, data: { active: !own.active } })
}

export async function saveGroup(shopId: string, id: string | undefined, input: { name: string; nameBn: string; sort: number }) {
  const slug = slugify(input.name)
  if (id) {
    const own = await db.productGroup.findFirst({ where: { id, shopId } })
    if (!own) throw new AppError("গ্রুপ পাওয়া যায়নি।", "Group not found.")
    return db.productGroup.update({ where: { id }, data: { name: input.name, nameBn: input.nameBn || input.name, sort: input.sort } })
  }
  return db.productGroup.upsert({ where: { shopId_slug: { shopId, slug } }, update: { name: input.name, nameBn: input.nameBn || input.name, sort: input.sort, active: true }, create: { shopId, slug, name: input.name, nameBn: input.nameBn || input.name, sort: input.sort } })
}

/* ---------- cart & orders ---------- */

export type CartLine = { variantId: string; qty: number }

export type PricedLine = { productId: string; variantId: string; name: string; nameBn: string; label: string; unitPrice: number; qty: number; lineTotal: number; photo: string }

export function shopRules(settings: Record<string, string>) {
  return {
    delivery: Math.max(0, Number(settings.shopDelivery) || 0),
    freeAbove: Math.max(0, Number(settings.shopFreeAbove) || 0),
    minOrder: Math.max(0, Number(settings.shopMinOrder) || 0),
  }
}

/** Price a cart against the database (never trust client prices); drops lines that are no longer sold. */
export async function priceCart(shopId: string, lines: CartLine[]): Promise<PricedLine[]> {
  const ids = Array.from(new Set(lines.map((l) => l.variantId))).slice(0, 40)
  const variants = await db.productVariant.findMany({ where: { id: { in: ids }, active: true, product: { shopId, active: true } }, include: { product: true } })
  const out: PricedLine[] = []
  for (const l of lines) {
    const v = variants.find((x) => x.id === l.variantId)
    if (!v) continue
    const qty = Math.min(99, Math.max(1, Math.round(l.qty)))
    if (v.stock >= 0 && v.stock < qty) throw new AppError(`${v.product.nameBn} (${v.label}): মাত্র ${v.stock}টা আছে।`, `${v.product.name} (${v.label}): only ${v.stock} left.`)
    out.push({ productId: v.productId, variantId: v.id, name: v.product.name, nameBn: v.product.nameBn, label: v.label, unitPrice: v.price, qty, lineTotal: v.price * qty, photo: v.product.photos.split(",")[0]?.trim() ?? "" })
  }
  return out
}

export function parseCart(json: string): CartLine[] {
  try {
    const raw = JSON.parse(json) as unknown
    if (!Array.isArray(raw)) return []
    return raw.filter((x): x is { variantId: string; qty: number } => !!x && typeof x === "object" && typeof (x as { variantId?: unknown }).variantId === "string").map((x) => ({ variantId: x.variantId, qty: Number(x.qty) || 1 })).slice(0, 40)
  } catch {
    return []
  }
}

export type NewShopOrder = {
  cart: CartLine[]
  phone: string
  contactName: string
  addressLine: string
  landmark: string
  notes: string
  paymentMethod: string
  couponCode?: string
}

/** A customer orders products; delivery is a flat charge (free above a threshold), paid on delivery or by bKash/Nagad. */
export async function createShopOrder(shopId: string, customer: { id: string; name: string }, input: NewShopOrder) {
  const category = await shopCategory(shopId)
  const offering = category?.offerings[0]
  if (!category || !offering) throw new AppError("এই শাখায় শপ চালু নেই।", "This branch has no shop yet.")
  const lines = await priceCart(shopId, input.cart)
  if (!lines.length) throw new AppError("কার্ট খালি। আগে কিছু যোগ করুন।", "Your cart is empty.")
  const settings = await getSettings(shopId)
  const rules = shopRules(settings)
  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0)
  if (subtotal < rules.minOrder) throw new AppError(`ন্যূনতম অর্ডার ৳${rules.minOrder}।`, `Minimum order is ৳${rules.minOrder}.`)
  const method = paymentProvider(input.paymentMethod)
  if (!method || settings[method.setting] === "0") throw new AppError("ক্যাশ অন ডেলিভারি, বিকাশ বা নগদ থেকে একটা বেছে নিন।", "Choose cash on delivery, bKash or Nagad.")
  if (input.addressLine.trim().length < 6) throw new AppError("পুরো ডেলিভারি ঠিকানা লিখুন (বাসা, রোড, এলাকা, জেলা)।", "Enter the full delivery address (house, road, area, district).")
  const delivery = rules.freeAbove && subtotal >= rules.freeAbove ? 0 : rules.delivery
  const coupon = input.couponCode?.trim() ? await quoteCoupon(shopId, input.couponCode, { categoryId: category.id, work: subtotal, customerId: customer.id }) : null
  const discount = coupon?.discount ?? 0
  const area = await db.serviceArea.findFirst({ where: { shopId, slug: "nationwide" } }) ?? (await db.serviceArea.findFirst({ where: { shopId }, orderBy: { sort: "asc" } }))
  if (!area) throw new AppError("শপের এলাকা সেট নেই।", "The shop has no delivery area configured.")
  const code = await newCode(category)
  const booking = await db.serviceBooking.create({
    data: {
      code,
      shopId,
      customerId: customer.id,
      categoryId: category.id,
      offeringId: offering.id,
      areaId: area.id,
      addressLine: input.addressLine.trim(),
      landmark: input.landmark.trim(),
      phone: input.phone,
      contactName: input.contactName.trim() || customer.name,
      visitDate: localToday(),
      visitSlot: "ডেলিভারি",
      notes: input.notes.trim(),
      pricing: "FIXED",
      unitPrice: subtotal,
      quantity: 1,
      visitCharge: delivery,
      estimatedPrice: subtotal + delivery - discount,
      couponId: coupon?.coupon.id ?? null,
      couponCode: coupon?.coupon.code ?? "",
      discount,
      paymentMethod: method.id,
      items: { create: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, name: l.name, nameBn: l.nameBn, label: l.label, unitPrice: l.unitPrice, qty: l.qty, lineTotal: l.lineTotal })) },
      events: { create: { toStatus: "REQUESTED", note: "Ordered", actorId: customer.id, actorRole: "CUSTOMER" } },
      chat: { create: {} },
    },
  })
  for (const l of lines) await db.productVariant.updateMany({ where: { id: l.variantId, stock: { gte: 0 } }, data: { stock: { decrement: l.qty } } })
  if (coupon) await db.coupon.update({ where: { id: coupon.coupon.id }, data: { usedCount: { increment: 1 } } })
  const summary = lines.map((l) => `${l.nameBn} (${l.label}) × ${l.qty}`).join(", ")
  await notify([customer.id], { kind: "BOOKING", title: "অর্ডার হয়েছে", body: `${booking.code} · ${summary}। কনফার্ম করে কুরিয়ারে পাঠালেই জানাব।`, link: `/bookings/${booking.code}` })
  await notify(await officeIds(shopId), { kind: "BOOKING", title: "নতুন শপ অর্ডার", body: `${booking.code} · ${summary} · ৳${subtotal + delivery - discount}`, link: `/admin/bookings/${booking.code}` })
  return booking
}
