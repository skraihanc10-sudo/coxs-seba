import { db } from "./db"
import { AppError } from "./errors"

export const COUPON_KINDS = ["PERCENT", "FIXED"] as const
export type CouponKind = (typeof COUPON_KINDS)[number]

export function normaliseCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "")
}

export type CouponQuote = {
  coupon: { id: string; code: string; kind: string; value: number; maxDiscount: number; minAmount: number }
  /** Taka taken off the work price (never more than the work price). */
  discount: number
}

/** How much a coupon takes off a work price (before the area/visit charge). */
export function discountFor(coupon: { kind: string; value: number; maxDiscount: number }, work: number) {
  if (work <= 0) return 0
  let off = coupon.kind === "PERCENT" ? Math.round((work * coupon.value) / 100) : coupon.value
  if (coupon.maxDiscount > 0) off = Math.min(off, coupon.maxDiscount)
  return Math.max(0, Math.min(off, work))
}

export function describeCoupon(c: { kind: string; value: number; maxDiscount: number; minAmount: number }, locale: "bn" | "en") {
  const bn = locale === "bn"
  const base = c.kind === "PERCENT" ? (bn ? `${c.value}% ছাড়` : `${c.value}% off`) : bn ? `৳${c.value} ছাড়` : `৳${c.value} off`
  const cap = c.kind === "PERCENT" && c.maxDiscount ? (bn ? `, সর্বোচ্চ ৳${c.maxDiscount}` : `, up to ৳${c.maxDiscount}`) : ""
  const min = c.minAmount ? (bn ? `, ন্যূনতম ৳${c.minAmount} কাজে` : `, on jobs from ৳${c.minAmount}`) : ""
  return `${base}${cap}${min}`
}

/**
 * Check a code for one shop/category/customer and work price. Throws a
 * customer-readable AppError when it cannot be used; returns the discount otherwise.
 */
export async function quoteCoupon(shopId: string, rawCode: string, ctx: { categoryId: string; work: number; customerId?: string | null }): Promise<CouponQuote> {
  const code = normaliseCode(rawCode)
  if (!code) throw new AppError("কুপন কোড লিখুন।", "Enter a coupon code.")
  const coupon = await db.coupon.findUnique({ where: { shopId_code: { shopId, code } } })
  if (!coupon || !coupon.active) throw new AppError("এই কুপন কোডটা ঠিক নেই।", "That coupon code is not valid.")
  const now = new Date()
  if (coupon.startsAt && coupon.startsAt > now) throw new AppError("এই কুপন এখনো চালু হয়নি।", "This coupon is not active yet.")
  if (coupon.endsAt && coupon.endsAt < now) throw new AppError("এই কুপনের মেয়াদ শেষ।", "This coupon has expired.")
  if (coupon.categoryId && coupon.categoryId !== ctx.categoryId) throw new AppError("এই কুপন এই সেবায় চলে না।", "This coupon does not apply to this service.")
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw new AppError("এই কুপনের সব ব্যবহার শেষ।", "This coupon has been fully used.")
  if (coupon.minAmount > 0 && ctx.work < coupon.minAmount) throw new AppError(`এই কুপন ন্যূনতম ৳${coupon.minAmount} কাজে চলে।`, `This coupon needs a job of at least ৳${coupon.minAmount}.`)
  if (coupon.perCustomer > 0 && ctx.customerId) {
    const used = await db.serviceBooking.count({ where: { couponId: coupon.id, customerId: ctx.customerId, status: { not: "CANCELLED" } } })
    if (used >= coupon.perCustomer) throw new AppError("আপনি এই কুপন আগেই ব্যবহার করেছেন।", "You have already used this coupon.")
  }
  const discount = discountFor(coupon, ctx.work)
  if (discount <= 0) throw new AppError("এই কাজে কুপনের ছাড় প্রযোজ্য নয়।", "The coupon gives no discount on this job.")
  return { coupon: { id: coupon.id, code: coupon.code, kind: coupon.kind, value: coupon.value, maxDiscount: coupon.maxDiscount, minAmount: coupon.minAmount }, discount }
}

export type CouponInput = {
  id?: string
  code: string
  kind: string
  value: number
  minAmount: number
  maxDiscount: number
  categoryId: string
  startsAt: string
  endsAt: string
  usageLimit: number
  perCustomer: number
  note: string
  active: boolean
}

/** Admin creates or edits a coupon of their shop. */
export async function saveCoupon(shopId: string, input: CouponInput) {
  const code = normaliseCode(input.code)
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) throw new AppError("কোড ৩–২০ অক্ষর, শুধু ইংরেজি অক্ষর/সংখ্যা।", "Code must be 3–20 letters or digits.")
  if (input.kind === "PERCENT" && (input.value < 1 || input.value > 100)) throw new AppError("শতাংশ ১–১০০ দিন।", "Percent must be 1–100.")
  if (input.kind === "FIXED" && input.value < 1) throw new AppError("ছাড়ের টাকা দিন।", "Enter the discount amount.")
  let categoryId: string | null = null
  if (input.categoryId) {
    const cat = await db.serviceCategory.findFirst({ where: { id: input.categoryId, shopId } })
    if (!cat) throw new AppError("ক্যাটাগরি ঠিক নেই।", "Bad category.")
    categoryId = cat.id
  }
  const startsAt = input.startsAt ? new Date(input.startsAt) : null
  const endsAt = input.endsAt ? new Date(`${input.endsAt}T23:59:59`) : null
  if (startsAt && Number.isNaN(startsAt.getTime())) throw new AppError("শুরুর তারিখ ঠিক নেই।", "Bad start date.")
  if (endsAt && Number.isNaN(endsAt.getTime())) throw new AppError("শেষের তারিখ ঠিক নেই।", "Bad end date.")
  const clash = await db.coupon.findFirst({ where: { shopId, code, NOT: input.id ? { id: input.id } : undefined } })
  if (clash) throw new AppError("এই কোড আগেই আছে।", "That code already exists.")
  const data = { code, kind: input.kind, value: input.value, minAmount: input.minAmount, maxDiscount: input.maxDiscount, categoryId, startsAt, endsAt, usageLimit: input.usageLimit, perCustomer: input.perCustomer, note: input.note, active: input.active }
  if (input.id) {
    const own = await db.coupon.findFirst({ where: { id: input.id, shopId } })
    if (!own) throw new AppError("কুপন পাওয়া যায়নি।", "Coupon not found.")
    return db.coupon.update({ where: { id: input.id }, data })
  }
  return db.coupon.create({ data: { ...data, shopId } })
}

export async function shopCoupons(shopId: string) {
  return db.coupon.findMany({ where: { shopId }, include: { category: { select: { name: true, nameBn: true } }, _count: { select: { bookings: true } } }, orderBy: [{ active: "desc" }, { createdAt: "desc" }] })
}
