import bcrypt from "bcryptjs"
import { db } from "./db"
import { AppError } from "./errors"
import { notify, officeIds } from "./notify"
import { normalisePhone } from "./format"
import type { Locale } from "./format"

export const VEHICLE_STATUS = ["PENDING", "APPROVED", "PAUSED", "REJECTED"] as const
export type VehicleStatus = (typeof VEHICLE_STATUS)[number]

export const VEHICLE_STATUS_TEXT: Record<string, { bn: string; en: string }> = {
  PENDING: { bn: "অনুমোদনের অপেক্ষায়", en: "Waiting for approval" },
  APPROVED: { bn: "চালু", en: "Live" },
  PAUSED: { bn: "বন্ধ রাখা", en: "Paused" },
  REJECTED: { bn: "বাতিল", en: "Rejected" },
}

export const vehicleInclude = {
  offering: { select: { id: true, slug: true, name: true, nameBn: true, categoryId: true, category: { select: { slug: true, name: true, nameBn: true, flow: true } } } },
  worker: { select: { id: true, kind: true, approved: true, rating: true, ratingCount: true, user: { select: { id: true, name: true, phone: true, active: true } } } },
  shop: { select: { id: true, slug: true, city: true, cityBn: true } },
} as const

export type VehicleRow = NonNullable<Awaited<ReturnType<typeof vehicleById>>>

/** Photo names stored comma separated; the first one is the cover. */
export function photosOf(v: { photos: string }) {
  return v.photos.split(",").map((p) => p.trim()).filter(Boolean)
}

/** Spec tags ("149cc, ABS") as a list. */
export function specsOf(v: { specs: string }) {
  return v.specs.split(",").map((s) => s.trim()).filter(Boolean)
}

/** Browser URL of a stored photo name; bundled demo photos are kept as site paths. */
export function photoUrl(name: string) {
  return name.startsWith("/") || name.startsWith("http") ? name : `/api/uploads/${name}`
}

export function vehicleName(v: { title: string; titleBn: string }, locale: Locale) {
  return locale === "bn" ? v.titleBn || v.title : v.title || v.titleBn
}

/** Vehicles a customer can book right now in one shop, optionally one type (offering). */
export async function bookableVehicles(shopId: string, offeringId?: string) {
  return db.vehicle.findMany({
    where: { shopId, status: "APPROVED", ...(offeringId ? { offeringId } : {}), OR: [{ workerId: null }, { worker: { approved: true, user: { active: true } } }] },
    include: vehicleInclude,
    orderBy: [{ sort: "asc" }, { pricePerDay: "asc" }, { createdAt: "asc" }],
  })
}

/**
 * The public marketplace: every live vehicle of every branch in one list
 * (vehicles are not split by shop on the customer side).
 */
export async function marketVehicles() {
  return db.vehicle.findMany({
    where: { status: "APPROVED", shop: { active: true }, offering: { active: true, category: { active: true } }, OR: [{ workerId: null }, { worker: { approved: true, user: { active: true } } }] },
    include: vehicleInclude,
    orderBy: [{ sort: "asc" }, { pricePerDay: "asc" }, { createdAt: "asc" }],
  })
}

export async function vehicleById(id: string) {
  return db.vehicle.findUnique({ where: { id }, include: vehicleInclude })
}

/** Every vehicle of one shop for the admin list: pending first. */
export async function shopVehicles(shopId: string) {
  const rows = await db.vehicle.findMany({ where: { shopId }, include: { ...vehicleInclude, _count: { select: { bookings: true } } }, orderBy: [{ createdAt: "desc" }] })
  const rank: Record<string, number> = { PENDING: 0, APPROVED: 1, PAUSED: 2, REJECTED: 3 }
  return rows.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))
}

/** The rental category of a shop (flow RENTAL) with its vehicle types. */
export async function rentalCategory(shopId: string) {
  return db.serviceCategory.findFirst({
    where: { shopId, flow: "RENTAL", active: true },
    include: { offerings: { where: { active: true }, orderBy: { sort: "asc" } } },
    orderBy: { sort: "asc" },
  })
}

export type VehicleInput = {
  offeringId: string
  title: string
  titleBn: string
  plate: string
  seats: number
  detail: string
  detailBn: string
  pricePerHour: number
  pricePerDay: number
  pricePerHalfDay: number
  specs: string
  minHours: number
}

async function rentalOffering(shopId: string, offeringId: string) {
  const offering = await db.serviceOffering.findFirst({ where: { id: offeringId, active: true, category: { shopId, flow: "RENTAL", active: true } }, include: { category: true } })
  if (!offering) throw new AppError("গাড়ির ধরন ঠিক নেই।", "Pick a valid vehicle type.")
  return offering
}

function checkPrices(input: VehicleInput) {
  if (!input.pricePerHour && !input.pricePerDay && !input.pricePerHalfDay) throw new AppError("ঘণ্টা বা দিনের অন্তত একটা ভাড়া দিন।", "Give an hourly or a daily rate (or both).")
}

function vehicleData(offeringId: string, input: VehicleInput) {
  return {
    offeringId,
    title: input.title,
    titleBn: input.titleBn || input.title,
    plate: input.plate,
    seats: input.seats,
    detail: input.detail,
    detailBn: input.detailBn,
    pricePerHour: input.pricePerHour,
    pricePerDay: input.pricePerDay,
    pricePerHalfDay: input.pricePerHalfDay,
    specs: specsOf({ specs: input.specs }).slice(0, 6).join(", "),
    minHours: input.minHours,
  }
}

/**
 * A vehicle owner signs up from the public page: one WORKER user (inactive until
 * approved), a PARTNER profile skilled in the rental category, and a PENDING vehicle.
 */
export async function applyAsPartner(shopId: string, person: { name: string; phone: string; email: string; password: string }, input: VehicleInput, photos: string[]) {
  const phone = normalisePhone(person.phone)
  if (!phone) throw new AppError("সঠিক মোবাইল নম্বর দিন।", "Enter a valid mobile number.")
  const email = person.email ? person.email.toLowerCase() : null
  const offering = await rentalOffering(shopId, input.offeringId)
  checkPrices(input)
  const clash = await db.user.findFirst({ where: { OR: [{ phone }, ...(email ? [{ email }] : [])] } })
  if (clash) {
    throw new AppError(
      "এই মোবাইল বা ইমেইলে আগেই অ্যাকাউন্ট আছে। লগইন করে “আমার গাড়ি” থেকে গাড়ি যোগ করুন।",
      "That mobile or email already has an account. Log in and add the vehicle under “My vehicles”.",
    )
  }
  const passwordHash = await bcrypt.hash(person.password, 10)
  const vehicle = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: person.name, phone, email, passwordHash, role: "WORKER", shopId, active: false } })
    const worker = await tx.workerProfile.create({ data: { userId: user.id, shopId, kind: "PARTNER", approved: false, skills: { create: { categoryId: offering.categoryId } } } })
    return tx.vehicle.create({ data: { ...vehicleData(offering.id, input), shopId, workerId: worker.id, photos: photos.join(","), status: "PENDING" } })
  })
  await notify(await officeIds(shopId), {
    kind: "SYSTEM",
    title: "নতুন গাড়ির পার্টনার আবেদন",
    body: `${person.name} · ${vehicle.titleBn} (${offering.nameBn})। অনুমোদন দিন।`,
    link: "/admin/vehicles",
  })
  return vehicle
}

/** A logged-in partner adds another vehicle (goes PENDING) or edits one of theirs. */
export async function savePartnerVehicle(worker: { id: string; shopId: string }, id: string | undefined, input: VehicleInput, photos: string[]) {
  const offering = await rentalOffering(worker.shopId, input.offeringId)
  checkPrices(input)
  const data = vehicleData(offering.id, input)
  if (id) {
    const own = await db.vehicle.findFirst({ where: { id, workerId: worker.id } })
    if (!own) throw new AppError("গাড়িটা পাওয়া যায়নি।", "Vehicle not found.")
    return db.vehicle.update({
      where: { id },
      data: { ...data, ...(photos.length ? { photos: photos.join(",") } : {}), ...(own.status === "REJECTED" ? { status: "PENDING", rejectNote: "" } : {}) },
    })
  }
  await db.workerSkill.upsert({ where: { workerId_categoryId: { workerId: worker.id, categoryId: offering.categoryId } }, update: {}, create: { workerId: worker.id, categoryId: offering.categoryId } })
  const vehicle = await db.vehicle.create({ data: { ...data, shopId: worker.shopId, workerId: worker.id, photos: photos.join(","), status: "PENDING" } })
  await notify(await officeIds(worker.shopId), { kind: "SYSTEM", title: "নতুন গাড়ি যোগ হয়েছে", body: `${vehicle.titleBn} অনুমোদনের অপেক্ষায়।`, link: "/admin/vehicles" })
  return vehicle
}

/** Partner pauses/resumes their own live vehicle. */
export async function togglePartnerVehicle(worker: { id: string }, id: string) {
  const own = await db.vehicle.findFirst({ where: { id, workerId: worker.id } })
  if (!own) throw new AppError("গাড়িটা পাওয়া যায়নি।", "Vehicle not found.")
  if (own.status !== "APPROVED" && own.status !== "PAUSED") throw new AppError("অনুমোদনের পর চালু/বন্ধ করা যাবে।", "You can pause it once it is approved.")
  return db.vehicle.update({ where: { id }, data: { status: own.status === "APPROVED" ? "PAUSED" : "APPROVED" } })
}

/** Admin adds a shop-owned vehicle (live at once) or edits any vehicle of the shop. */
export async function saveShopVehicle(shopId: string, id: string | undefined, input: VehicleInput & { workerId?: string | null; sort?: number }, photos: string[]) {
  const offering = await rentalOffering(shopId, input.offeringId)
  checkPrices(input)
  let workerId: string | null = null
  if (input.workerId) {
    const w = await db.workerProfile.findFirst({ where: { id: input.workerId, shopId } })
    if (!w) throw new AppError("এই কর্মী এই শপের নন।", "That worker is not in this shop.")
    workerId = w.id
    await db.workerSkill.upsert({ where: { workerId_categoryId: { workerId, categoryId: offering.categoryId } }, update: {}, create: { workerId, categoryId: offering.categoryId } })
  }
  const data = { ...vehicleData(offering.id, input), workerId, sort: input.sort ?? 0 }
  if (id) {
    const own = await db.vehicle.findFirst({ where: { id, shopId } })
    if (!own) throw new AppError("গাড়িটা পাওয়া যায়নি।", "Vehicle not found.")
    return db.vehicle.update({ where: { id }, data: { ...data, ...(photos.length ? { photos: photos.join(",") } : {}) } })
  }
  return db.vehicle.create({ data: { ...data, shopId, photos: photos.join(","), status: "APPROVED" } })
}

/**
 * Admin decision on a vehicle. Approving a partner's first vehicle also switches
 * their login on (user.active, worker.approved) and tells them.
 */
export async function reviewVehicle(shopId: string, id: string, decision: "APPROVE" | "REJECT" | "PAUSE" | "RESUME", note = "") {
  const vehicle = await db.vehicle.findFirst({ where: { id, shopId }, include: { worker: { include: { user: true } } } })
  if (!vehicle) throw new AppError("গাড়িটা পাওয়া যায়নি।", "Vehicle not found.")
  const status = decision === "APPROVE" || decision === "RESUME" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "PAUSED"
  if (decision === "REJECT" && note.trim().length < 3) throw new AppError("বাতিলের কারণ লিখুন।", "Add a reason for rejecting.")
  await db.$transaction(async (tx) => {
    await tx.vehicle.update({ where: { id }, data: { status, rejectNote: decision === "REJECT" ? note.trim() : "" } })
    if (decision === "APPROVE" && vehicle.worker && (!vehicle.worker.approved || !vehicle.worker.user.active)) {
      await tx.workerProfile.update({ where: { id: vehicle.worker.id }, data: { approved: true } })
      await tx.user.update({ where: { id: vehicle.worker.userId }, data: { active: true } })
    }
  })
  if (vehicle.worker) {
    const titles = { APPROVE: "আপনার গাড়ি অনুমোদন পেয়েছে", REJECT: "গাড়ির আবেদন বাতিল", PAUSE: "গাড়ি সাময়িক বন্ধ", RESUME: "গাড়ি আবার চালু" }
    const body =
      decision === "APPROVE"
        ? `${vehicle.titleBn} এখন সাইটে দেখাচ্ছে। মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে লগইন করে ভাড়ার অর্ডার দেখুন।`
        : decision === "REJECT"
          ? `${vehicle.titleBn}: ${note.trim()}`
          : vehicle.titleBn
    await notify([vehicle.worker.userId], { kind: "SYSTEM", title: titles[decision], body, link: "/worker/vehicles" })
  }
  return vehicle
}

/** Partner's cut of a rental bill (the rest is the platform's). */
export function partnerShare(finalPrice: number, visitCharge: number, percent: number) {
  return Math.round(Math.max(0, finalPrice - visitCharge) * (percent / 100))
}
