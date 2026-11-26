import type { Prisma } from "@prisma/client"
import { db } from "./db"
import { AppError } from "./errors"
import { notify, officeIds } from "./notify"
import { localToday, shiftDays } from "./format"
import type { Locale } from "./format"
import { quoteCoupon } from "./coupons"
import { directAssignData, newCode } from "./bookings"
import { paymentProvider } from "./payments"
import { getSettings } from "./settings"
import { VEHICLE_STATUS_TEXT } from "./vehicles"

/**
 * Resort & hotel booking: properties (listed by HANDYO or by partner owners),
 * their room types, and stay bookings (check-in → check-out, rooms × nights).
 * Mirrors the vehicle marketplace: PENDING → APPROVED by an admin, orders go
 * to the owner's partner panel, chat with the customer, partner share on payout.
 */

export const PROPERTY_KINDS = ["RESORT", "HOTEL", "COTTAGE", "GUESTHOUSE"] as const
export type PropertyKind = (typeof PROPERTY_KINDS)[number]

export const PROPERTY_KIND_TEXT: Record<string, { bn: string; en: string }> = {
  RESORT: { bn: "রিসোর্ট", en: "Resort" },
  HOTEL: { bn: "হোটেল", en: "Hotel" },
  COTTAGE: { bn: "কটেজ", en: "Cottage" },
  GUESTHOUSE: { bn: "গেস্ট হাউস", en: "Guest house" },
}

export const STAY_STATUS_TEXT = VEHICLE_STATUS_TEXT

export const MAX_STAY_NIGHTS = 30
export const MAX_STAY_ROOMS = 10
/** How far ahead a stay can be booked. */
export const STAY_BOOKING_DAYS = 180

export const propertyInclude = {
  shop: { select: { id: true, slug: true, city: true, cityBn: true } },
  area: { select: { id: true, name: true, nameBn: true } },
  worker: { select: { id: true, kind: true, approved: true, autoAssign: true, userId: true, rating: true, ratingCount: true, user: { select: { id: true, name: true, phone: true, active: true } } } },
  rooms: { orderBy: [{ sort: "asc" }, { pricePerNight: "asc" }] },
} satisfies Prisma.PropertyInclude

export type PropertyRow = NonNullable<Awaited<ReturnType<typeof propertyById>>>

export function listOf(text: string) {
  return text.split(",").map((s) => s.trim()).filter(Boolean)
}

export function propertyName(p: { name: string; nameBn: string }, locale: Locale) {
  return locale === "bn" ? p.nameBn || p.name : p.name || p.nameBn
}

export function kindText(kind: string, locale: Locale) {
  const row = PROPERTY_KIND_TEXT[kind] ?? PROPERTY_KIND_TEXT.RESORT
  return locale === "bn" ? row.bn : row.en
}

/** Cheapest active room of a property, or null when none is priced. */
export function fromNight(p: { rooms: Array<{ pricePerNight: number; active: boolean }> }) {
  const prices = p.rooms.filter((r) => r.active && r.pricePerNight > 0).map((r) => r.pricePerNight)
  return prices.length ? Math.min(...prices) : null
}

/** The stay category of a shop (flow STAY) with its single hidden offering. */
export async function stayCategory(shopId: string) {
  return db.serviceCategory.findFirst({
    where: { shopId, flow: "STAY", active: true },
    include: { offerings: { where: { active: true }, orderBy: { sort: "asc" } } },
    orderBy: { sort: "asc" },
  })
}

const liveWhere = { status: "APPROVED", shop: { active: true }, OR: [{ workerId: null }, { worker: { approved: true, user: { active: true } } }] } satisfies Prisma.PropertyWhereInput

/** Every live property of every branch: the public marketplace. */
export async function marketProperties() {
  return db.property.findMany({ where: liveWhere, include: propertyInclude, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] })
}

export async function propertyById(id: string) {
  return db.property.findUnique({ where: { id }, include: propertyInclude })
}

/** A property customers may see and book right now. */
export async function liveProperty(id: string) {
  const p = await propertyById(id)
  if (!p || p.status !== "APPROVED" || !p.shop) return null
  if (p.worker && (!p.worker.approved || !p.worker.user.active)) return null
  return p
}

/** Every property of one shop for the admin list: pending first. */
export async function shopProperties(shopId: string) {
  const rows = await db.property.findMany({ where: { shopId }, include: { ...propertyInclude, _count: { select: { bookings: true } } }, orderBy: [{ createdAt: "desc" }] })
  const rank: Record<string, number> = { PENDING: 0, APPROVED: 1, PAUSED: 2, REJECTED: 3 }
  return rows.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))
}

/* ---------- room types typed as lines ---------- */

export type RoomInput = { name: string; sleeps: number; pricePerNight: number; totalRooms: number; amenities: string }

/**
 * Room types one per line: `name | sleeps | price per night | rooms available | amenities`.
 * The name and a price are required; sleeps defaults to 2, rooms to 1.
 */
export function parseRooms(text: string): RoomInput[] {
  const out: RoomInput[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split("|").map((p) => p.trim())
    const name = parts[0] ?? ""
    const sleeps = Math.round(Number(parts[1] ?? "2")) || 2
    const price = Math.round(Number((parts[2] ?? "").replace(/[^\d.]/g, "")))
    const total = Math.round(Number(parts[3] ?? "1")) || 1
    if (!name || !Number.isFinite(price) || price <= 0) {
      throw new AppError(`রুমের লাইনটা ঠিক নেই: "${line.slice(0, 40)}"। ফরম্যাট: রুমের নাম | কতজন | প্রতি রাত দাম | কয়টা রুম | সুবিধা`, `Bad room line: "${line.slice(0, 40)}". Format: room name | sleeps | price per night | rooms | amenities`)
    }
    out.push({ name: name.slice(0, 80), sleeps: Math.min(20, Math.max(1, sleeps)), pricePerNight: price, totalRooms: Math.min(200, Math.max(1, total)), amenities: (parts[4] ?? "").slice(0, 200) })
    if (out.length >= 12) break
  }
  return out
}

export function roomsText(rooms: Array<{ name: string; sleeps: number; pricePerNight: number; totalRooms: number; amenities: string }>) {
  return rooms.map((r) => `${r.name} | ${r.sleeps} | ${r.pricePerNight} | ${r.totalRooms} | ${r.amenities}`).join("\n")
}

/**
 * Replace a property's room types. Rooms with the same name keep their id (and
 * their bookings); the rest are deactivated rather than deleted when booked.
 */
async function syncRooms(propertyId: string, rooms: RoomInput[]) {
  const existing = await db.roomType.findMany({ where: { propertyId }, include: { _count: { select: { bookings: true } } } })
  const keep = new Set<string>()
  for (const [i, r] of rooms.entries()) {
    const same = existing.find((e) => e.name.toLowerCase() === r.name.toLowerCase() && !keep.has(e.id))
    if (same) {
      keep.add(same.id)
      await db.roomType.update({ where: { id: same.id }, data: { ...r, sort: i, active: true } })
    } else {
      const created = await db.roomType.create({ data: { ...r, propertyId, sort: i } })
      keep.add(created.id)
    }
  }
  for (const e of existing) {
    if (keep.has(e.id)) continue
    if (e._count.bookings) await db.roomType.update({ where: { id: e.id }, data: { active: false } })
    else await db.roomType.delete({ where: { id: e.id } })
  }
}

/* ---------- partner / admin writes ---------- */

export type PropertyInput = {
  kind: string
  areaId: string
  name: string
  nameBn: string
  address: string
  addressBn: string
  amenities: string
  checkIn: string
  checkOut: string
  policy: string
  policyBn: string
  detail: string
  detailBn: string
  rooms: string
}

function propertyData(input: PropertyInput) {
  if (!PROPERTY_KINDS.includes(input.kind as PropertyKind)) throw new AppError("ধরন ঠিক নেই।", "Pick a valid kind.")
  return {
    kind: input.kind,
    name: input.name,
    nameBn: input.nameBn || input.name,
    address: input.address,
    addressBn: input.addressBn || input.address,
    amenities: listOf(input.amenities).slice(0, 12).join(", "),
    checkIn: input.checkIn || "14:00",
    checkOut: input.checkOut || "12:00",
    policy: input.policy,
    policyBn: input.policyBn,
    detail: input.detail,
    detailBn: input.detailBn,
  }
}

async function areaOf(shopId: string, areaId: string) {
  const area = await db.serviceArea.findFirst({ where: { id: areaId, shopId, active: true } })
  if (!area) throw new AppError("এলাকা বেছে নিন।", "Choose the area.")
  return area
}

async function requireRooms(input: PropertyInput) {
  const rooms = parseRooms(input.rooms)
  if (!rooms.length) throw new AppError("অন্তত একটা রুমের ধরন আর প্রতি রাতের দাম দিন।", "Add at least one room type with a nightly price.")
  return rooms
}

/** A logged-in partner adds a property (PENDING) or edits one of theirs. */
export async function savePartnerProperty(worker: { id: string; shopId: string }, id: string | undefined, input: PropertyInput, photos: string[]) {
  const category = await stayCategory(worker.shopId)
  if (!category) throw new AppError("এই শাখায় রিসোর্ট বুকিং চালু নেই।", "This branch has no resort booking yet.")
  const area = await areaOf(worker.shopId, input.areaId)
  const rooms = await requireRooms(input)
  const data = { ...propertyData(input), areaId: area.id }
  if (id) {
    const own = await db.property.findFirst({ where: { id, workerId: worker.id } })
    if (!own) throw new AppError("রিসোর্টটা পাওয়া যায়নি।", "Property not found.")
    const saved = await db.property.update({ where: { id }, data: { ...data, ...(photos.length ? { photos: photos.join(",") } : {}), ...(own.status === "REJECTED" ? { status: "PENDING", rejectNote: "" } : {}) } })
    await syncRooms(id, rooms)
    return saved
  }
  await db.workerSkill.upsert({ where: { workerId_categoryId: { workerId: worker.id, categoryId: category.id } }, update: {}, create: { workerId: worker.id, categoryId: category.id } })
  const property = await db.property.create({ data: { ...data, shopId: worker.shopId, workerId: worker.id, photos: photos.join(","), status: "PENDING", rooms: { create: rooms.map((r, i) => ({ ...r, sort: i })) } } })
  await notify(await officeIds(worker.shopId), { kind: "SYSTEM", title: "নতুন রিসোর্ট যোগ হয়েছে", body: `${property.nameBn} অনুমোদনের অপেক্ষায়।`, link: "/admin/stays" })
  return property
}

export async function togglePartnerProperty(worker: { id: string }, id: string) {
  const own = await db.property.findFirst({ where: { id, workerId: worker.id } })
  if (!own) throw new AppError("রিসোর্টটা পাওয়া যায়নি।", "Property not found.")
  if (own.status !== "APPROVED" && own.status !== "PAUSED") throw new AppError("অনুমোদনের পর চালু/বন্ধ করা যাবে।", "You can pause it once it is approved.")
  return db.property.update({ where: { id }, data: { status: own.status === "APPROVED" ? "PAUSED" : "APPROVED" } })
}

/** Admin adds a HANDYO-managed property (live at once) or edits any property of the shop. */
export async function saveShopProperty(shopId: string, id: string | undefined, input: PropertyInput & { workerId?: string | null; sort?: number }, photos: string[]) {
  const category = await stayCategory(shopId)
  if (!category) throw new AppError("এই শপে রিসোর্ট (STAY) ক্যাটাগরি নেই।", "This shop has no STAY category.")
  const area = await areaOf(shopId, input.areaId)
  const rooms = await requireRooms(input)
  let workerId: string | null = null
  if (input.workerId) {
    const w = await db.workerProfile.findFirst({ where: { id: input.workerId, shopId } })
    if (!w) throw new AppError("এই পার্টনার এই শপের নন।", "That partner is not in this shop.")
    workerId = w.id
    await db.workerSkill.upsert({ where: { workerId_categoryId: { workerId, categoryId: category.id } }, update: {}, create: { workerId, categoryId: category.id } })
  }
  const data = { ...propertyData(input), areaId: area.id, workerId, sort: input.sort ?? 0 }
  if (id) {
    const own = await db.property.findFirst({ where: { id, shopId } })
    if (!own) throw new AppError("রিসোর্টটা পাওয়া যায়নি।", "Property not found.")
    const saved = await db.property.update({ where: { id }, data: { ...data, ...(photos.length ? { photos: photos.join(",") } : {}) } })
    await syncRooms(id, rooms)
    return saved
  }
  return db.property.create({ data: { ...data, shopId, photos: photos.join(","), status: "APPROVED", rooms: { create: rooms.map((r, i) => ({ ...r, sort: i })) } } })
}

/** Admin decision; approving a partner's first property also switches their login on. */
export async function reviewProperty(shopId: string, id: string, decision: "APPROVE" | "REJECT" | "PAUSE" | "RESUME", note = "") {
  const property = await db.property.findFirst({ where: { id, shopId }, include: { worker: { include: { user: true } } } })
  if (!property) throw new AppError("রিসোর্টটা পাওয়া যায়নি।", "Property not found.")
  const status = decision === "APPROVE" || decision === "RESUME" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "PAUSED"
  if (decision === "REJECT" && note.trim().length < 3) throw new AppError("বাতিলের কারণ লিখুন।", "Add a reason for rejecting.")
  await db.$transaction(async (tx) => {
    await tx.property.update({ where: { id }, data: { status, rejectNote: decision === "REJECT" ? note.trim() : "" } })
    if (decision === "APPROVE" && property.worker && (!property.worker.approved || !property.worker.user.active)) {
      await tx.workerProfile.update({ where: { id: property.worker.id }, data: { approved: true } })
      await tx.user.update({ where: { id: property.worker.userId }, data: { active: true } })
    }
  })
  if (property.worker) {
    const titles = { APPROVE: "আপনার রিসোর্ট অনুমোদন পেয়েছে", REJECT: "রিসোর্টের আবেদন বাতিল", PAUSE: "রিসোর্ট সাময়িক বন্ধ", RESUME: "রিসোর্ট আবার চালু" }
    const body = decision === "APPROVE" ? `${property.nameBn} এখন সাইটে দেখাচ্ছে। মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে লগইন করে বুকিং দেখুন।` : decision === "REJECT" ? `${property.nameBn}: ${note.trim()}` : property.nameBn
    await notify([property.worker.userId], { kind: "SYSTEM", title: titles[decision], body, link: "/worker/stays" })
  }
  return property
}

/* ---------- availability & booking ---------- */

export function nightsBetween(checkIn: string, checkOut: string) {
  const a = new Date(`${checkIn}T00:00:00Z`).getTime()
  const b = new Date(`${checkOut}T00:00:00Z`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / 86400000)
}

/** Rooms of one type already taken on any night of [checkIn, checkOut). */
export async function roomsTaken(roomTypeId: string, checkIn: string, checkOut: string) {
  const rows = await db.serviceBooking.findMany({
    where: { roomTypeId, status: { not: "CANCELLED" }, visitDate: { lt: checkOut }, checkOut: { gt: checkIn } },
    select: { visitDate: true, checkOut: true, rooms: true },
  })
  // Peak overlap across the nights asked for.
  let peak = 0
  for (let d = checkIn; d < checkOut; d = shiftDays(d, 1)) {
    const taken = rows.filter((r) => r.visitDate <= d && r.checkOut > d).reduce((n, r) => n + r.rooms, 0)
    peak = Math.max(peak, taken)
  }
  return peak
}

export type StayQuote = {
  nights: number
  rooms: number
  pricePerNight: number
  /** Work price: nights × rooms × nightly rate. */
  total: number
  available: number
}

/** Validate dates and count free rooms; throws customer-readable errors. */
export async function quoteStay(roomType: { id: string; pricePerNight: number; totalRooms: number; sleeps: number }, checkIn: string, checkOut: string, rooms: number, guests: number): Promise<StayQuote> {
  const today = localToday()
  if (checkIn < today) throw new AppError("চেক-ইন আজ বা পরের কোনো দিন দিন।", "Check-in must be today or later.")
  if (checkIn > shiftDays(today, STAY_BOOKING_DAYS)) throw new AppError("এত দূরের তারিখে এখনো বুকিং নেওয়া হচ্ছে না।", "That date is too far ahead to book yet.")
  const nights = nightsBetween(checkIn, checkOut)
  if (nights < 1) throw new AppError("চেক-আউট চেক-ইনের পরের দিন বা তার পরে দিন।", "Check-out must be after check-in.")
  if (nights > MAX_STAY_NIGHTS) throw new AppError(`একবারে সর্বোচ্চ ${MAX_STAY_NIGHTS} রাত।`, `Up to ${MAX_STAY_NIGHTS} nights per booking.`)
  const want = Math.min(MAX_STAY_ROOMS, Math.max(1, rooms))
  if (guests > want * roomType.sleeps) throw new AppError(`এই রুমে ${roomType.sleeps} জন করে থাকা যায়; আরও রুম নিন।`, `This room sleeps ${roomType.sleeps}; add more rooms.`)
  const taken = await roomsTaken(roomType.id, checkIn, checkOut)
  const available = Math.max(0, roomType.totalRooms - taken)
  if (available < want) throw new AppError(available ? `এই তারিখে মাত্র ${available}টা রুম খালি আছে।` : "এই তারিখে এই রুম খালি নেই, অন্য তারিখ বা রুম দেখুন।", available ? `Only ${available} room(s) free on those dates.` : "No rooms of this type are free on those dates.")
  return { nights, rooms: want, pricePerNight: roomType.pricePerNight, total: nights * want * roomType.pricePerNight, available }
}

export type NewStayBooking = {
  propertyId: string
  roomTypeId: string
  checkIn: string
  checkOut: string
  rooms: number
  guests: number
  phone: string
  contactName: string
  notes: string
  paymentMethod: string
  couponCode?: string
}

/** A customer books rooms for a date range; the order lands with the office like any other booking. */
export async function createStayBooking(customer: { id: string; name: string }, input: NewStayBooking) {
  const property = await liveProperty(input.propertyId)
  if (!property) throw new AppError("এই রিসোর্ট এখন বুকিং নিচ্ছে না।", "This property is not taking bookings right now.")
  const room = property.rooms.find((r) => r.id === input.roomTypeId && r.active)
  if (!room) throw new AppError("রুমের ধরনটা বেছে নিন।", "Pick a room type.")
  const category = await stayCategory(property.shopId)
  const offering = category?.offerings[0]
  if (!category || !offering) throw new AppError("এই শাখায় রিসোর্ট বুকিং চালু নেই।", "This branch has no resort booking yet.")
  const settings = await getSettings(property.shopId)
  const method = paymentProvider(input.paymentMethod)
  if (!method || settings[method.setting] === "0") throw new AppError("ক্যাশ, বিকাশ বা নগদ থেকে একটা বেছে নিন।", "Choose cash, bKash or Nagad.")
  const guests = Math.min(60, Math.max(1, input.guests))
  const q = await quoteStay(room, input.checkIn, input.checkOut, input.rooms, guests)
  const coupon = input.couponCode?.trim() ? await quoteCoupon(property.shopId, input.couponCode, { categoryId: category.id, work: q.total, customerId: customer.id }) : null
  const discount = coupon?.discount ?? 0
  const direct = property.worker?.autoAssign ? { id: property.worker.id, userId: property.worker.userId, name: property.worker.user.name } : null
  const code = await newCode(category)
  const booking = await db.serviceBooking.create({
    data: {
      code,
      shopId: property.shopId,
      customerId: customer.id,
      categoryId: category.id,
      offeringId: offering.id,
      areaId: property.areaId,
      addressLine: property.addressBn || property.address || property.nameBn,
      landmark: property.nameBn,
      phone: input.phone,
      contactName: input.contactName.trim() || customer.name,
      visitDate: input.checkIn,
      visitSlot: `${property.checkIn} ${"চেক-ইন"}`,
      checkOut: input.checkOut,
      nights: q.nights,
      rooms: q.rooms,
      guests,
      propertyId: property.id,
      roomTypeId: room.id,
      notes: input.notes.trim(),
      pricing: "PER_NIGHT",
      unitPrice: room.pricePerNight * q.rooms,
      quantity: q.nights,
      visitCharge: 0,
      estimatedPrice: q.total - discount,
      couponId: coupon?.coupon.id ?? null,
      couponCode: coupon?.coupon.code ?? "",
      discount,
      paymentMethod: method.id,
      ...directAssignData(direct, customer.id),
      chat: { create: {} },
    },
  })
  if (coupon) await db.coupon.update({ where: { id: coupon.coupon.id }, data: { usedCount: { increment: 1 } } })
  if (direct) await notify([direct.userId], { kind: "BOOKING", title: "নতুন রুম বুকিং", body: `${booking.code} · ${room.name} × ${q.rooms} · ${q.nights} রাত · সরাসরি আপনার কাছে।`, link: `/worker/jobs/${booking.code}` })
  await notify([customer.id], { kind: "BOOKING", title: "বুকিং হয়েছে", body: `${booking.code} · ${property.nameBn} · ${q.nights} রাত। রিসোর্ট নিশ্চিত করলেই জানাব।`, link: `/bookings/${booking.code}` })
  await notify(await officeIds(property.shopId), { kind: "BOOKING", title: "নতুন রিসোর্ট বুকিং", body: `${booking.code} · ${property.nameBn} · ${room.name} × ${q.rooms} · ${q.nights} রাত`, link: `/admin/bookings/${booking.code}` })
  return booking
}
