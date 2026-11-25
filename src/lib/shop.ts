import bcrypt from "bcryptjs"
import type { Prisma } from "@prisma/client"
import { db } from "./db"
import { AppError } from "./errors"
import { notify, officeIds } from "./notify"
import { localToday, normalisePhone } from "./format"
import type { Locale } from "./format"
import { quoteCoupon } from "./coupons"
import { directAssignData, newCode } from "./bookings"
import { paymentProvider } from "./payments"
import { getSettings } from "./settings"
import { VEHICLE_STATUS_TEXT } from "./vehicles"

/**
 * The product shops (শুঁটকি / আচার): partner stores, shelves (groups) per
 * category, products with variants, and orders. Checkout splits the cart into
 * one parcel (= one ServiceBooking of the SHOP category, with OrderItem lines)
 * per store, so each store owner gets their own order in the partner panel.
 */

export const STORE_STATUS_TEXT = VEHICLE_STATUS_TEXT

export const storeSelect = { id: true, slug: true, name: true, nameBn: true, photos: true, workerId: true, status: true } as const

export const productInclude = {
  group: { select: { id: true, slug: true, name: true, nameBn: true, categoryId: true } },
  store: { select: storeSelect },
  variants: { orderBy: { sort: "asc" } },
} satisfies Prisma.ProductInclude

export type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>

export const storeInclude = {
  worker: { select: { id: true, kind: true, approved: true, autoAssign: true, userId: true, user: { select: { id: true, name: true, phone: true, active: true } } } },
  _count: { select: { products: true, orders: true } },
} satisfies Prisma.StoreInclude

export function productName(p: { name: string; nameBn: string }, locale: Locale) {
  return locale === "bn" ? p.nameBn || p.name : p.name || p.nameBn
}

/** Price range of a product's active variants: [min, max]. */
export function priceRange(p: { variants: Array<{ price: number; active: boolean }> }) {
  const prices = p.variants.filter((v) => v.active).map((v) => v.price)
  return prices.length ? [Math.min(...prices), Math.max(...prices)] : [0, 0]
}

/** A SHOP-flow category of a shop: the given one, or the first (for checkout without a category). */
export async function shopCategory(shopId: string, categoryId?: string) {
  return db.serviceCategory.findFirst({ where: { shopId, flow: "SHOP", active: true, ...(categoryId ? { id: categoryId } : {}) }, include: { offerings: { where: { active: true }, orderBy: { sort: "asc" } } }, orderBy: { sort: "asc" } })
}

export async function shopGroups(shopId: string, onlyActive = true, categoryId?: string) {
  return db.productGroup.findMany({ where: { shopId, ...(onlyActive ? { active: true } : {}), ...(categoryId ? { OR: [{ categoryId }, { categoryId: null }] } : {}) }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] })
}

const liveStoreWhere = { status: "APPROVED", OR: [{ workerId: null }, { worker: { approved: true, user: { active: true } } }] } satisfies Prisma.StoreWhereInput

/** Stores customers can buy from right now. */
export async function liveStores(shopId: string) {
  return db.store.findMany({ where: { shopId, ...liveStoreWhere }, include: storeInclude, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] })
}

/**
 * Products customers can buy right now, optionally one category's shelves only.
 * `strict` leaves out the shared shelves (categoryId null): the laundry price
 * list wants only its own items, never dried fish.
 */
export async function liveProducts(shopId: string, categoryId?: string, strict = false) {
  return db.product.findMany({
    where: { shopId, active: true, variants: { some: { active: true } }, OR: [{ storeId: null }, { store: liveStoreWhere }], ...(categoryId ? { group: strict ? { categoryId } : { OR: [{ categoryId }, { categoryId: null }] } } : {}) },
    include: productInclude,
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
  })
}

export async function allProducts(shopId: string, storeId?: string) {
  return db.product.findMany({ where: { shopId, ...(storeId ? { storeId } : {}) }, include: { ...productInclude, _count: { select: { items: true } } }, orderBy: [{ active: "desc" }, { sort: "asc" }, { createdAt: "asc" }] })
}

export async function productBySlug(shopId: string, slug: string) {
  return db.product.findFirst({ where: { shopId, slug, active: true, OR: [{ storeId: null }, { store: liveStoreWhere }] }, include: productInclude })
}

export async function storeById(id: string) {
  return db.store.findUnique({ where: { id }, include: storeInclude })
}

export async function shopStores(shopId: string) {
  const rows = await db.store.findMany({ where: { shopId }, include: storeInclude, orderBy: [{ createdAt: "desc" }] })
  const rank: Record<string, number> = { PENDING: 0, APPROVED: 1, PAUSED: 2, REJECTED: 3 }
  return rows.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))
}

/* ---------- admin / partner writes: products ---------- */

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
  storeId?: string | null
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

/**
 * Create or edit a product. `storeId` is the store it belongs to (null =
 * HANDYO's own); `onlyStore` restricts a partner to their own store's products.
 */
export async function saveProduct(shopId: string, id: string | undefined, input: ProductInput, photos: string[], onlyStore?: string) {
  const group = await db.productGroup.findFirst({ where: { id: input.groupId, shopId } })
  if (!group) throw new AppError("শেলফ (গ্রুপ) বেছে নিন।", "Pick a shelf (group).")
  const storeId = onlyStore ?? (input.storeId || null)
  if (storeId) {
    const st = await db.store.findFirst({ where: { id: storeId, shopId } })
    if (!st) throw new AppError("দোকান পাওয়া যায়নি।", "Store not found.")
  }
  const variants = parseVariants(input.variants)
  if (!variants.length) throw new AppError("অন্তত একটা ভ্যারিয়েন্ট (সাইজ/ওজন আর দাম) দিন।", "Add at least one variant (size/weight and price).")
  let slug = slugify(input.slug || input.name)
  const clash = await db.product.findFirst({ where: { shopId, slug, NOT: id ? { id } : undefined } })
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`
  const data = { groupId: group.id, storeId, name: input.name, nameBn: input.nameBn || input.name, slug, badge: input.badge, detail: input.detail, detailBn: input.detailBn, sort: input.sort, active: input.active }
  if (id) {
    const own = await db.product.findFirst({ where: { id, shopId, ...(onlyStore ? { storeId: onlyStore } : {}) }, include: { variants: true } })
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

export async function toggleProduct(shopId: string, id: string, onlyStore?: string) {
  const own = await db.product.findFirst({ where: { id, shopId, ...(onlyStore ? { storeId: onlyStore } : {}) } })
  if (!own) throw new AppError("প্রোডাক্ট পাওয়া যায়নি।", "Product not found.")
  return db.product.update({ where: { id }, data: { active: !own.active } })
}

export async function saveGroup(shopId: string, id: string | undefined, input: { name: string; nameBn: string; sort: number; categoryId?: string | null }) {
  const slug = slugify(input.name)
  const categoryId = input.categoryId ? (await db.serviceCategory.findFirst({ where: { id: input.categoryId, shopId, flow: "SHOP" } }))?.id ?? null : null
  if (id) {
    const own = await db.productGroup.findFirst({ where: { id, shopId } })
    if (!own) throw new AppError("গ্রুপ পাওয়া যায়নি।", "Group not found.")
    return db.productGroup.update({ where: { id }, data: { name: input.name, nameBn: input.nameBn || input.name, sort: input.sort, categoryId } })
  }
  return db.productGroup.upsert({ where: { shopId_slug: { shopId, slug } }, update: { name: input.name, nameBn: input.nameBn || input.name, sort: input.sort, active: true, categoryId }, create: { shopId, slug, name: input.name, nameBn: input.nameBn || input.name, sort: input.sort, categoryId } })
}

/* ---------- stores ---------- */

export type StoreInput = { name: string; nameBn: string; address: string; addressBn: string; detail: string; detailBn: string }

function storeData(input: StoreInput) {
  return { name: input.name, nameBn: input.nameBn || input.name, address: input.address, addressBn: input.addressBn || input.address, detail: input.detail, detailBn: input.detailBn }
}

async function uniqueStoreSlug(shopId: string, name: string, keep?: string) {
  let slug = slugify(name)
  const clash = await db.store.findFirst({ where: { shopId, slug, NOT: keep ? { id: keep } : undefined } })
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`
  return slug
}

/** A store owner signs up from the public page: inactive WORKER + PARTNER profile + PENDING store. */
export async function applyAsStorePartner(shopId: string, person: { name: string; phone: string; email: string; password: string }, input: StoreInput, photos: string[]) {
  const phone = normalisePhone(person.phone)
  if (!phone) throw new AppError("সঠিক মোবাইল নম্বর দিন।", "Enter a valid mobile number.")
  const email = person.email ? person.email.toLowerCase() : null
  const categories = await db.serviceCategory.findMany({ where: { shopId, flow: "SHOP", active: true } })
  if (!categories.length) throw new AppError("এই শাখায় শপ চালু নেই।", "This branch has no shop yet.")
  const clash = await db.user.findFirst({ where: { OR: [{ phone }, ...(email ? [{ email }] : [])] } })
  if (clash) throw new AppError("এই মোবাইল বা ইমেইলে আগেই অ্যাকাউন্ট আছে। লগইন করে “আমার দোকান” খুলুন।", "That mobile or email already has an account. Log in and open “My store”.")
  const passwordHash = await bcrypt.hash(person.password, 10)
  const slug = await uniqueStoreSlug(shopId, input.name)
  const store = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: person.name, phone, email, passwordHash, role: "WORKER", shopId, active: false } })
    const worker = await tx.workerProfile.create({ data: { userId: user.id, shopId, kind: "PARTNER", approved: false, skills: { create: categories.map((c) => ({ categoryId: c.id })) } } })
    return tx.store.create({ data: { ...storeData(input), shopId, slug, workerId: worker.id, photos: photos.join(","), status: "PENDING" } })
  })
  await notify(await officeIds(shopId), { kind: "SYSTEM", title: "নতুন দোকানের পার্টনার আবেদন", body: `${person.name} · ${store.nameBn}। অনুমোদন দিন।`, link: "/admin/stores" })
  return store
}

/** The store of a logged-in partner (one store per partner). */
export async function partnerStore(workerId: string) {
  return db.store.findFirst({ where: { workerId }, include: storeInclude, orderBy: { createdAt: "asc" } })
}

/** Partner edits their own store (a rejected one goes back to PENDING). */
export async function savePartnerStore(worker: { id: string; shopId: string }, input: StoreInput, photos: string[]) {
  const own = await partnerStore(worker.id)
  if (own) {
    return db.store.update({ where: { id: own.id }, data: { ...storeData(input), ...(photos.length ? { photos: photos.join(",") } : {}), ...(own.status === "REJECTED" ? { status: "PENDING", rejectNote: "" } : {}) } })
  }
  const categories = await db.serviceCategory.findMany({ where: { shopId: worker.shopId, flow: "SHOP", active: true } })
  for (const c of categories) await db.workerSkill.upsert({ where: { workerId_categoryId: { workerId: worker.id, categoryId: c.id } }, update: {}, create: { workerId: worker.id, categoryId: c.id } })
  const slug = await uniqueStoreSlug(worker.shopId, input.name)
  const store = await db.store.create({ data: { ...storeData(input), shopId: worker.shopId, slug, workerId: worker.id, photos: photos.join(","), status: "PENDING" } })
  await notify(await officeIds(worker.shopId), { kind: "SYSTEM", title: "নতুন দোকান যোগ হয়েছে", body: `${store.nameBn} অনুমোদনের অপেক্ষায়।`, link: "/admin/stores" })
  return store
}

/** Admin creates a HANDYO-managed store or edits any store of the shop (owner, sort). */
export async function saveShopStore(shopId: string, id: string | undefined, input: StoreInput & { workerId?: string | null; sort?: number }, photos: string[]) {
  let workerId: string | null = null
  if (input.workerId) {
    const w = await db.workerProfile.findFirst({ where: { id: input.workerId, shopId } })
    if (!w) throw new AppError("এই পার্টনার এই শপের নন।", "That partner is not in this shop.")
    workerId = w.id
    const categories = await db.serviceCategory.findMany({ where: { shopId, flow: "SHOP", active: true } })
    for (const c of categories) await db.workerSkill.upsert({ where: { workerId_categoryId: { workerId, categoryId: c.id } }, update: {}, create: { workerId, categoryId: c.id } })
  }
  const data = { ...storeData(input), workerId, sort: input.sort ?? 0 }
  if (id) {
    const own = await db.store.findFirst({ where: { id, shopId } })
    if (!own) throw new AppError("দোকান পাওয়া যায়নি।", "Store not found.")
    return db.store.update({ where: { id }, data: { ...data, ...(photos.length ? { photos: photos.join(",") } : {}) } })
  }
  const slug = await uniqueStoreSlug(shopId, input.name)
  return db.store.create({ data: { ...data, shopId, slug, photos: photos.join(","), status: "APPROVED" } })
}

/** Admin decision on a store; approving a partner's store also switches their login on. */
export async function reviewStore(shopId: string, id: string, decision: "APPROVE" | "REJECT" | "PAUSE" | "RESUME", note = "") {
  const store = await db.store.findFirst({ where: { id, shopId }, include: { worker: { include: { user: true } } } })
  if (!store) throw new AppError("দোকান পাওয়া যায়নি।", "Store not found.")
  const status = decision === "APPROVE" || decision === "RESUME" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "PAUSED"
  if (decision === "REJECT" && note.trim().length < 3) throw new AppError("বাতিলের কারণ লিখুন।", "Add a reason for rejecting.")
  await db.$transaction(async (tx) => {
    await tx.store.update({ where: { id }, data: { status, rejectNote: decision === "REJECT" ? note.trim() : "" } })
    if (decision === "APPROVE" && store.worker && (!store.worker.approved || !store.worker.user.active)) {
      await tx.workerProfile.update({ where: { id: store.worker.id }, data: { approved: true } })
      await tx.user.update({ where: { id: store.worker.userId }, data: { active: true } })
    }
  })
  if (store.worker) {
    const titles = { APPROVE: "আপনার দোকান অনুমোদন পেয়েছে", REJECT: "দোকানের আবেদন বাতিল", PAUSE: "দোকান সাময়িক বন্ধ", RESUME: "দোকান আবার চালু" }
    const body = decision === "APPROVE" ? `${store.nameBn} এখন সাইটে। লগইন করে “আমার দোকান” থেকে পণ্য যোগ করুন।` : decision === "REJECT" ? `${store.nameBn}: ${note.trim()}` : store.nameBn
    await notify([store.worker.userId], { kind: "SYSTEM", title: titles[decision], body, link: "/worker/store" })
  }
  return store
}

/* ---------- cart & orders ---------- */

export type CartLine = { variantId: string; qty: number }

export type PricedLine = { productId: string; variantId: string; name: string; nameBn: string; label: string; unitPrice: number; qty: number; lineTotal: number; photo: string; storeId: string; storeName: string; storeNameBn: string; categoryId: string | null; flow: string }

export function shopRules(settings: Record<string, string>) {
  return {
    delivery: Math.max(0, Number(settings.shopDelivery) || 0),
    freeAbove: Math.max(0, Number(settings.shopFreeAbove) || 0),
    minOrder: Math.max(0, Number(settings.shopMinOrder) || 0),
  }
}

/** Laundry orders by the piece: the rider's pickup + return charge and the minimum order. */
export function laundryRules(settings: Record<string, string>) {
  return {
    delivery: Math.max(0, Number(settings.laundryDelivery) || 0),
    freeAbove: Math.max(0, Number(settings.laundryFreeAbove) || 0),
    minOrder: Math.max(0, Number(settings.laundryMinOrder) || 0),
  }
}

/** Price a cart against the database (never trust client prices); drops lines that are no longer sold. */
export async function priceCart(shopId: string, lines: CartLine[]): Promise<PricedLine[]> {
  const ids = Array.from(new Set(lines.map((l) => l.variantId))).slice(0, 40)
  const variants = await db.productVariant.findMany({ where: { id: { in: ids }, active: true, product: { shopId, active: true, OR: [{ storeId: null }, { store: liveStoreWhere }] } }, include: { product: { include: { store: { select: storeSelect }, group: { select: { categoryId: true } } } } } })
  const catIds = Array.from(new Set(variants.map((v) => v.product.group.categoryId).filter((x): x is string => !!x)))
  const flows = new Map((await db.serviceCategory.findMany({ where: { id: { in: catIds } }, select: { id: true, flow: true } })).map((c) => [c.id, c.flow]))
  const out: PricedLine[] = []
  for (const l of lines) {
    const v = variants.find((x) => x.id === l.variantId)
    if (!v) continue
    const qty = Math.min(99, Math.max(1, Math.round(l.qty)))
    if (v.stock >= 0 && v.stock < qty) throw new AppError(`${v.product.nameBn} (${v.label}): মাত্র ${v.stock}টা আছে।`, `${v.product.name} (${v.label}): only ${v.stock} left.`)
    out.push({
      productId: v.productId, variantId: v.id, name: v.product.name, nameBn: v.product.nameBn, label: v.label, unitPrice: v.price, qty, lineTotal: v.price * qty,
      photo: v.product.photos.split(",")[0]?.trim() ?? "",
      storeId: v.product.store?.id ?? "", storeName: v.product.store?.name ?? "HANDYO", storeNameBn: v.product.store?.nameBn ?? "HANDYO",
      categoryId: v.product.group.categoryId,
      flow: (v.product.group.categoryId && flows.get(v.product.group.categoryId)) || "SHOP",
    })
  }
  return out
}

/** Lines grouped per store: one parcel each. */
export function parcelsOf(lines: PricedLine[]) {
  const map = new Map<string, PricedLine[]>()
  for (const l of lines) map.set(l.storeId, [...(map.get(l.storeId) ?? []), l])
  return Array.from(map.entries()).map(([storeId, items]) => ({ storeId, storeName: items[0].storeName, storeNameBn: items[0].storeNameBn, items, subtotal: items.reduce((n, l) => n + l.lineTotal, 0) }))
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

/**
 * A customer orders products. The cart becomes one parcel per store (each its
 * own booking, delivery charged per parcel); the coupon applies to the first
 * parcel's goods. Store owners are notified; with the direct switch the parcel
 * is assigned to them at once.
 */
export async function createShopOrder(shopId: string, customer: { id: string; name: string }, input: NewShopOrder) {
  const lines = await priceCart(shopId, input.cart)
  if (!lines.length) throw new AppError("কার্ট খালি। আগে কিছু যোগ করুন।", "Your cart is empty.")
  const settings = await getSettings(shopId)
  const laundryOnly = lines.every((l) => l.flow === "LAUNDRY")
  const rules = laundryOnly ? laundryRules(settings) : shopRules(settings)
  const subtotalAll = lines.reduce((n, l) => n + l.lineTotal, 0)
  if (subtotalAll < rules.minOrder) throw new AppError(`ন্যূনতম অর্ডার ৳${rules.minOrder}।`, `Minimum order is ৳${rules.minOrder}.`)
  const method = paymentProvider(input.paymentMethod)
  if (!method || settings[method.setting] === "0") throw new AppError("ক্যাশ অন ডেলিভারি, বিকাশ বা নগদ থেকে একটা বেছে নিন।", "Choose cash on delivery, bKash or Nagad.")
  if (input.addressLine.trim().length < 6) throw new AppError("পুরো ডেলিভারি ঠিকানা লিখুন (বাসা, রোড, এলাকা, জেলা)।", "Enter the full delivery address (house, road, area, district).")
  const area = (await db.serviceArea.findFirst({ where: { shopId, slug: "nationwide" } })) ?? (await db.serviceArea.findFirst({ where: { shopId }, orderBy: { sort: "asc" } }))
  if (!area) throw new AppError("শপের এলাকা সেট নেই।", "The shop has no delivery area configured.")
  const categories = await db.serviceCategory.findMany({ where: { shopId, flow: { in: ["SHOP", "LAUNDRY"] }, active: true }, include: { offerings: { where: { active: true }, orderBy: { sort: "asc" } } }, orderBy: { sort: "asc" } })
  const fallback = categories.find((c) => c.flow === "SHOP") ?? categories[0]
  if (!fallback || !fallback.offerings[0]) throw new AppError("এই শাখায় শপ চালু নেই।", "This branch has no shop yet.")
  const parcels = parcelsOf(lines)
  const stores = await db.store.findMany({ where: { id: { in: parcels.map((p) => p.storeId).filter(Boolean) } }, include: { worker: { select: { id: true, autoAssign: true, userId: true, user: { select: { name: true } } } } } })
  const created: Array<{ code: string; id: string }> = []
  let couponLeft = input.couponCode?.trim() ?? ""
  for (const parcel of parcels) {
    // The parcel's category is the one most of its items belong to.
    const counts = new Map<string, number>()
    for (const l of parcel.items) if (l.categoryId) counts.set(l.categoryId, (counts.get(l.categoryId) ?? 0) + l.qty)
    const topId = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
    const category = categories.find((c) => c.id === topId && c.offerings[0]) ?? fallback
    const laundry = category.flow === "LAUNDRY"
    // Per-piece laundry books against its hidden "by-item" offering; shop parcels use the category's first.
    const offering = (laundry ? category.offerings.find((o) => o.slug === "by-item") : null) ?? category.offerings[0]
    const parcelRules = laundry ? laundryRules(settings) : shopRules(settings)
    const delivery = parcelRules.freeAbove && parcel.subtotal >= parcelRules.freeAbove ? 0 : parcelRules.delivery
    const coupon = couponLeft ? await quoteCoupon(shopId, couponLeft, { categoryId: category.id, work: parcel.subtotal, customerId: customer.id }) : null
    couponLeft = ""
    const discount = coupon?.discount ?? 0
    const store = stores.find((s) => s.id === parcel.storeId) ?? null
    const direct = store?.worker?.autoAssign ? { id: store.worker.id, userId: store.worker.userId, name: store.worker.user.name } : null
    const code = await newCode(category)
    const booking = await db.serviceBooking.create({
      data: {
        code,
        shopId,
        customerId: customer.id,
        categoryId: category.id,
        offeringId: offering.id,
        areaId: area.id,
        storeId: store?.id ?? null,
        addressLine: input.addressLine.trim(),
        landmark: input.landmark.trim(),
        phone: input.phone,
        contactName: input.contactName.trim() || customer.name,
        visitDate: localToday(),
        visitSlot: laundry ? "পিকআপ" : "ডেলিভারি",
        notes: input.notes.trim(),
        pricing: "FIXED",
        unitPrice: parcel.subtotal,
        quantity: 1,
        visitCharge: delivery,
        estimatedPrice: parcel.subtotal + delivery - discount,
        couponId: coupon?.coupon.id ?? null,
        couponCode: coupon?.coupon.code ?? "",
        discount,
        paymentMethod: method.id,
        items: { create: parcel.items.map((l) => ({ productId: l.productId, variantId: l.variantId, name: l.name, nameBn: l.nameBn, label: l.label, unitPrice: l.unitPrice, qty: l.qty, lineTotal: l.lineTotal })) },
        ...directAssignData(direct, customer.id),
        chat: { create: {} },
      },
    })
    for (const l of parcel.items) await db.productVariant.updateMany({ where: { id: l.variantId, stock: { gte: 0 } }, data: { stock: { decrement: l.qty } } })
    if (coupon) await db.coupon.update({ where: { id: coupon.coupon.id }, data: { usedCount: { increment: 1 } } })
    const summary = parcel.items.map((l) => `${l.nameBn} (${l.label}) × ${l.qty}`).join(", ")
    if (store?.worker) await notify([store.worker.userId], { kind: "BOOKING", title: direct ? "নতুন অর্ডার এসেছে (সরাসরি)" : laundry ? "নতুন লন্ড্রি অর্ডার" : "আপনার দোকানে নতুন অর্ডার", body: `${booking.code} · ${summary} · ৳${parcel.subtotal}${direct ? "" : "। অফিস কনফার্ম করে পাঠাবে।"}`, link: `/worker/jobs/${booking.code}` })
    await notify(await officeIds(shopId), { kind: "BOOKING", title: laundry ? "নতুন লন্ড্রি অর্ডার (পিস হিসেবে)" : "নতুন শপ অর্ডার", body: `${booking.code} · ${parcel.storeNameBn} · ${summary} · ৳${parcel.subtotal + delivery - discount}`, link: `/admin/bookings/${booking.code}` })
    created.push({ code: booking.code, id: booking.id })
  }
  await notify([customer.id], {
    kind: "BOOKING",
    title: created.length > 1 ? `অর্ডার হয়েছে (${created.length}টা পার্সেল)` : "অর্ডার হয়েছে",
    body: created.length > 1 ? `${created.map((c) => c.code).join(", ")} – আলাদা দোকান থেকে আলাদা পার্সেলে আসবে।` : laundryOnly ? `${created[0].code} · কনফার্ম হলে রাইডার কাপড় নিতে আসবে।` : `${created[0].code} · কনফার্ম করে কুরিয়ারে পাঠালেই জানাব।`,
    link: `/bookings/${created[0].code}`,
  })
  return created
}
