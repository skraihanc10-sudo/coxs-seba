import bcrypt from "bcryptjs"
import type { Prisma } from "@prisma/client"
import { db } from "./db"
import { AppError } from "./errors"
import { notify, officeIds } from "./notify"
import { normalisePhone } from "./format"
import { getSettings } from "./settings"
import { billFor } from "./pricing"
import { partnerShare } from "./vehicles"
import { bookingFor, moveBooking, partnerOwns } from "./bookings"
import type { Role } from "./roles"
import type { PartnerSignupInput } from "./validation"
import { TICKET_SLUGS } from "./tickets"

/**
 * Partners (store owners, vehicle owners, resort owners) and what the office
 * controls about them: the approval queue for extra charges and cancellations,
 * helper accounts (max 2 per partner, approved by the office), the "list in
 * office" switch and the per-partner ledger (হিসাব).
 */

export const MAX_HELPERS = 2

export const ID_TYPES: Record<string, { bn: string; en: string }> = {
  NID: { bn: "জাতীয় পরিচয়পত্র (NID)", en: "National ID (NID)" },
  PASSPORT: { bn: "পাসপোর্ট", en: "Passport" },
  BIRTH: { bn: "জন্ম নিবন্ধন", en: "Birth certificate" },
  DRIVING: { bn: "ড্রাইভিং লাইসেন্স", en: "Driving licence" },
}

/** Category flows an outside partner may sell under. */
export const PARTNER_FLOWS = ["RENTAL", "STAY", "SHOP", "LAUNDRY"]

/* ---------- sign-up & approval ---------- */

/**
 * Anyone becomes a partner the same way: an account, ID papers and the
 * category they will sell under. The office approves the person; listings
 * (store, vehicles, resort, laundry items) are added from the panel afterwards
 * and get their own approval.
 */
export async function partnerSignup(shopId: string, input: PartnerSignupInput, idPhotos: string[]) {
  const phone = normalisePhone(input.phone)
  if (!phone) throw new AppError("সঠিক মোবাইল নম্বর দিন।", "Enter a valid mobile number.")
  const email = input.email ? input.email.toLowerCase() : null
  const category = await db.serviceCategory.findFirst({ where: { id: input.categoryId, shopId, active: true, OR: [{ flow: { in: PARTNER_FLOWS } }, { slug: { in: TICKET_SLUGS } }] } })
  if (!category) throw new AppError("এই ক্যাটাগরিতে পার্টনার নেওয়া হচ্ছে না।", "That category is not open to partners.")
  if (!idPhotos.length) throw new AppError("পরিচয়পত্রের ছবি দিন।", "Upload a photo of the ID.")
  const clash = await db.user.findFirst({ where: { OR: [{ phone }, ...(email ? [{ email }] : [])] } })
  if (clash) throw new AppError("এই মোবাইল বা ইমেইলে আগেই অ্যাকাউন্ট আছে। লগইন করুন।", "That mobile or email already has an account. Please log in.")
  const passwordHash = await bcrypt.hash(input.password, 10)
  const worker = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: input.name, phone, email, passwordHash, role: "WORKER", shopId, active: false } })
    return tx.workerProfile.create({
      data: { userId: user.id, shopId, kind: "PARTNER", approved: false, idType: input.idType, nid: input.idNumber, nidPhoto: idPhotos.join(","), businessName: input.businessName, skills: { create: { categoryId: category.id } } },
    })
  })
  await notify(await officeIds(shopId), { kind: "SYSTEM", title: "নতুন পার্টনার আবেদন", body: `${input.name} · ${category.nameBn}${input.businessName ? ` · ${input.businessName}` : ""}। কাগজ দেখে অনুমোদন দিন।`, link: "/admin/approvals" })
  return worker
}

export async function pendingPartners(shopId: string | null) {
  return db.workerProfile.findMany({
    where: { kind: "PARTNER", approved: false, ...(shopId ? { shopId } : {}) },
    include: { user: { select: { id: true, name: true, phone: true, email: true } }, skills: { include: { category: { select: { nameBn: true, name: true, flow: true } } } } },
    orderBy: { joinedAt: "asc" },
  })
}

/** The office approves a partner (login switched on) or rejects them (account removed). */
export async function reviewPartner(user: Viewer & { role: Role }, workerId: string, decision: "APPROVE" | "REJECT", note = "") {
  if (user.role !== "ADMIN" && user.role !== "OWNER") throw new AppError("অনুমোদন দিতে পারে শুধু অ্যাডমিন।", "Only an admin can decide.")
  const w = await db.workerProfile.findUnique({ where: { id: workerId }, include: { user: { select: { id: true, name: true } } } })
  if (!w || w.kind !== "PARTNER" || (user.role !== "OWNER" && user.shopId !== w.shopId)) throw new AppError("পার্টনার পাওয়া যায়নি।", "Partner not found.")
  if (decision === "REJECT") {
    await db.user.delete({ where: { id: w.userId } })
    return
  }
  await db.$transaction([
    db.workerProfile.update({ where: { id: w.id }, data: { approved: true, rejectNote: note } }),
    db.user.update({ where: { id: w.userId }, data: { active: true } }),
  ])
  await notify([w.userId], { kind: "SYSTEM", title: "আপনার পার্টনার অ্যাকাউন্ট অনুমোদিত", body: "এখন লগইন করে আপনার পণ্য, গাড়ি বা রিসোর্ট যোগ করুন; অফিস অনুমোদন দিলে সাইটে দেখাবে।", link: "/worker" })
}

type Viewer = { id: string; role: string; shopId?: string | null; worker?: { id: string; kind?: string } | null; isHelper?: boolean }

/** Every booking that belongs to a partner: assigned to them, or on their store / vehicle / resort. */
export function partnerBookingsWhere(workerId: string): Prisma.ServiceBookingWhereInput {
  return { OR: [{ workerId }, { store: { workerId } }, { vehicle: { workerId } }, { property: { workerId } }] }
}

export const requestInclude = {
  booking: { select: { id: true, code: true, status: true, estimatedPrice: true, finalPrice: true, extraCharge: true, offering: { select: { name: true, nameBn: true } }, category: { select: { flow: true } }, customer: { select: { name: true } }, store: { select: { name: true, nameBn: true } } } },
  requester: { select: { id: true, name: true, role: true } },
  decider: { select: { name: true } },
} satisfies Prisma.ChangeRequestInclude

export type RequestRow = Prisma.ChangeRequestGetPayload<{ include: typeof requestInclude }>

export const REQUEST_KIND_TEXT: Record<string, { bn: string; en: string }> = {
  EXTRA: { bn: "এক্সট্রা চার্জ", en: "Extra charge" },
  CANCEL: { bn: "বাতিলের অনুরোধ", en: "Cancellation" },
}

/* ---------- requests ---------- */

/** A customer or partner asks the office for something on a booking. */
export async function createRequest(user: Viewer & { role: Role }, code: string, kind: "EXTRA" | "CANCEL", amount: number, note: string) {
  const booking = await bookingFor(user, code)
  if (["COMPLETED", "CANCELLED"].includes(booking.status)) throw new AppError("বুকিংটা বন্ধ হয়ে গেছে।", "This booking is closed.")
  if (kind === "EXTRA") {
    if (user.role !== "WORKER") throw new AppError("এক্সট্রা চার্জ চাইতে পারে শুধু পার্টনার।", "Only a partner can ask for an extra charge.")
    if (!Number.isInteger(amount) || amount <= 0 || amount > 500000) throw new AppError("সঠিক টাকার অঙ্ক দিন।", "Enter a valid amount.")
    if (note.trim().length < 3) throw new AppError("কীসের জন্য এক্সট্রা, লিখুন।", "Say what the extra is for.")
  } else {
    if (note.trim().length < 3) throw new AppError("বাতিলের কারণ লিখুন।", "Add a reason for cancelling.")
    amount = 0
  }
  const open = await db.changeRequest.findFirst({ where: { bookingId: booking.id, kind, status: "PENDING" } })
  if (open) throw new AppError("এই অনুরোধ আগেই পাঠানো আছে, অফিস দেখছে।", "That request is already waiting for the office.")
  const row = await db.changeRequest.create({ data: { shopId: booking.shopId, bookingId: booking.id, kind, amount, note: note.trim(), requesterId: user.id, requesterRole: user.role } })
  await db.bookingEvent.create({ data: { bookingId: booking.id, fromStatus: booking.status, toStatus: booking.status, note: kind === "EXTRA" ? `Extra charge requested: ৳${amount} — ${note.trim()}` : `Cancellation requested — ${note.trim()}`, actorId: user.id, actorRole: user.role } })
  await notify(await officeIds(booking.shopId), {
    kind: "BOOKING",
    title: kind === "EXTRA" ? `${booking.code} · এক্সট্রা চার্জের অনুরোধ ৳${amount}` : `${booking.code} · বাতিলের অনুরোধ`,
    body: `${note.trim()} — অনুমোদন দিন বা নাকচ করুন।`,
    link: "/admin/approvals",
  })
  return row
}

/** The office approves or rejects. Approving an extra puts it on the bill; approving a cancel cancels the booking. */
export async function decideRequest(user: Viewer & { role: Role }, id: string, decision: "APPROVE" | "REJECT", note = "") {
  if (user.role !== "ADMIN" && user.role !== "OWNER") throw new AppError("অনুমোদন দিতে পারে শুধু অ্যাডমিন।", "Only an admin can decide.")
  const row = await db.changeRequest.findUnique({ where: { id }, include: { booking: { select: { code: true, shopId: true, customerId: true, extraCharge: true, extraNote: true, status: true, paymentStatus: true, worker: { select: { userId: true } } } } } })
  if (!row || row.status !== "PENDING") throw new AppError("অনুরোধটা পাওয়া যায়নি বা আগেই সিদ্ধান্ত হয়েছে।", "Request not found or already decided.")
  if (user.role !== "OWNER" && user.shopId !== row.shopId) throw new AppError("অন্য শপের অনুরোধ।", "That request belongs to another shop.")
  if (decision === "REJECT" && note.trim().length < 2) throw new AppError("নাকচের কারণ লিখুন।", "Add a reason for rejecting.")
  if (decision === "APPROVE") {
    if (row.kind === "EXTRA") {
      if (row.booking.paymentStatus === "PAID") throw new AppError("পেমেন্ট হয়ে যাওয়া বিলে এক্সট্রা যোগ করা যায় না।", "The bill is already paid.")
      const booking = await bookingFor(user, row.booking.code)
      const extraCharge = booking.extraCharge + row.amount
      const bill = billFor({ ...booking, extraCharge })
      await db.serviceBooking.update({
        where: { id: booking.id },
        data: {
          extraCharge,
          extraNote: [booking.extraNote, row.note].filter(Boolean).join("; "),
          ...(booking.status === "COMPLETED" ? { finalPrice: bill } : {}),
          events: { create: { fromStatus: booking.status, toStatus: booking.status, note: `Extra charge approved: +৳${row.amount} → ৳${bill} — ${row.note}`, actorId: user.id, actorRole: user.role } },
        },
      })
      await notify([booking.customerId], { kind: "BOOKING", title: `${booking.code} · বিলে এক্সট্রা যোগ হয়েছে`, body: `৳${row.amount} (${row.note})। এখন মোট ৳${bill}।`, link: `/bookings/${booking.code}` })
    } else {
      await moveBooking(user, row.booking.code, "CANCELLED", `${row.requesterRole === "CUSTOMER" ? "কাস্টমারের অনুরোধে" : "পার্টনারের অনুরোধে"}: ${row.note}`, { force: true })
    }
  }
  await db.changeRequest.update({ where: { id }, data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", deciderId: user.id, decisionNote: note.trim(), decidedAt: new Date() } })
  const what = row.kind === "EXTRA" ? `এক্সট্রা চার্জ ৳${row.amount}` : "বাতিলের অনুরোধ"
  await notify([row.requesterId], {
    kind: "BOOKING",
    title: `${row.booking.code} · ${what} ${decision === "APPROVE" ? "অনুমোদিত" : "নাকচ"}`,
    body: decision === "APPROVE" ? "অফিস অনুমোদন দিয়েছে।" : `অফিস নাকচ করেছে: ${note.trim()}`,
    link: row.requesterRole === "CUSTOMER" ? `/bookings/${row.booking.code}` : `/worker/jobs/${row.booking.code}`,
  }, user.id)
}

export async function pendingRequests(shopId: string | null) {
  return db.changeRequest.findMany({ where: { status: "PENDING", ...(shopId ? { shopId } : {}) }, include: requestInclude, orderBy: { createdAt: "asc" } })
}

export async function decidedRequests(shopId: string | null, take = 40) {
  return db.changeRequest.findMany({ where: { status: { not: "PENDING" }, ...(shopId ? { shopId } : {}) }, include: requestInclude, orderBy: { decidedAt: "desc" }, take })
}

/** Open requests on one booking, for the detail screens. */
export async function requestsOf(bookingId: string) {
  return db.changeRequest.findMany({ where: { bookingId }, include: requestInclude, orderBy: { createdAt: "desc" } })
}

/* ---------- helpers ---------- */

export async function partnerHelpers(workerId: string) {
  return db.user.findMany({ where: { helperOfId: workerId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, phone: true, active: true, helperStatus: true, createdAt: true } })
}

/** A partner adds a helper: the account waits for the office's approval before it can sign in. */
export async function addHelper(user: Viewer & { role: Role; name: string }, input: { name: string; phone: string; password: string }) {
  if (user.role !== "WORKER" || !user.worker || user.worker.kind !== "PARTNER") throw new AppError("হেল্পার যোগ করতে পারে শুধু পার্টনার।", "Only a partner can add helpers.")
  if (user.isHelper) throw new AppError("হেল্পার আরেকজন হেল্পার যোগ করতে পারে না।", "A helper cannot add helpers.")
  const name = input.name.trim()
  const phone = normalisePhone(input.phone)
  if (name.length < 2) throw new AppError("হেল্পারের নাম লিখুন।", "Enter the helper's name.")
  if (!phone) throw new AppError("সঠিক মোবাইল নম্বর দিন।", "Enter a valid mobile number.")
  if (input.password.length < 6) throw new AppError("পাসওয়ার্ড অন্তত ৬ অক্ষর।", "Password needs at least 6 characters.")
  const count = await db.user.count({ where: { helperOfId: user.worker.id, helperStatus: { in: ["PENDING", "APPROVED"] } } })
  if (count >= MAX_HELPERS) throw new AppError(`সর্বোচ্চ ${MAX_HELPERS} জন হেল্পার রাখা যায়।`, `You can have at most ${MAX_HELPERS} helpers.`)
  if (await db.user.findUnique({ where: { phone } })) throw new AppError("এই নম্বরে আগেই অ্যাকাউন্ট আছে।", "That number already has an account.")
  const shopId = (await db.workerProfile.findUnique({ where: { id: user.worker.id }, select: { shopId: true } }))?.shopId ?? null
  const helper = await db.user.create({ data: { name, phone, passwordHash: await bcrypt.hash(input.password, 10), role: "WORKER", shopId, active: false, helperOfId: user.worker.id, helperStatus: "PENDING" } })
  if (shopId) await notify(await officeIds(shopId), { kind: "SYSTEM", title: "নতুন হেল্পার অনুমোদনের অপেক্ষায়", body: `${user.name} হেল্পার যোগ করেছেন: ${name} (${phone})`, link: "/admin/approvals" })
  return helper
}

/** The office approves (account switched on) or rejects a helper, or a partner removes one. */
export async function reviewHelper(user: Viewer & { role: Role }, helperId: string, decision: "APPROVE" | "REJECT" | "REMOVE") {
  const helper = await db.user.findUnique({ where: { id: helperId }, include: { helperOf: { select: { id: true, shopId: true, userId: true } } } })
  if (!helper || !helper.helperOf) throw new AppError("হেল্পার পাওয়া যায়নি।", "Helper not found.")
  if (decision === "REMOVE") {
    if (user.role === "WORKER") {
      if (user.isHelper || user.worker?.id !== helper.helperOf.id) throw new AppError("অনুমতি নেই।", "Not allowed.")
    } else if (user.role !== "ADMIN" && user.role !== "OWNER") throw new AppError("অনুমতি নেই।", "Not allowed.")
    await db.user.delete({ where: { id: helperId } })
    return
  }
  if (user.role !== "ADMIN" && user.role !== "OWNER") throw new AppError("অনুমোদন দিতে পারে শুধু অ্যাডমিন।", "Only an admin can decide.")
  if (user.role !== "OWNER" && user.shopId !== helper.helperOf.shopId) throw new AppError("অন্য শপের হেল্পার।", "That helper belongs to another shop.")
  await db.user.update({ where: { id: helperId }, data: { helperStatus: decision === "APPROVE" ? "APPROVED" : "REJECTED", active: decision === "APPROVE" } })
  await notify([helper.helperOf.userId], { kind: "SYSTEM", title: decision === "APPROVE" ? `হেল্পার ${helper.name} অনুমোদিত` : `হেল্পার ${helper.name} নাকচ`, body: decision === "APPROVE" ? "এখন থেকে আপনার প্যানেলে লগইন করতে পারবে।" : "অফিস অনুমোদন দেয়নি।", link: "/worker/helpers" })
}

export async function pendingHelpers(shopId: string | null) {
  return db.user.findMany({ where: { helperStatus: "PENDING", ...(shopId ? { shopId } : {}) }, include: { helperOf: { include: { user: { select: { name: true } } } } }, orderBy: { createdAt: "asc" } })
}

/* ---------- office-list switch ---------- */

export async function setOfficeList(user: Viewer & { role: Role }, workerId: string, on: boolean) {
  if (user.role !== "ADMIN" && user.role !== "OWNER") throw new AppError("অনুমতি নেই।", "Not allowed.")
  const w = await db.workerProfile.findUnique({ where: { id: workerId } })
  if (!w || (user.role !== "OWNER" && user.shopId !== w.shopId)) throw new AppError("পার্টনার পাওয়া যায়নি।", "Partner not found.")
  await db.workerProfile.update({ where: { id: workerId }, data: { officeList: on } })
}

/* ---------- ledger (হিসাব) ---------- */

export type LedgerRow = {
  id: string
  code: string
  day: string
  title: string
  titleBn: string
  gross: number
  partner: number
  handyo: number
  paid: boolean
  status: string
}

/** Completed bookings of a partner with the money split, newest first. */
export async function partnerLedger(worker: { id: string; shopId: string }, take = 300) {
  const settings = await getSettings(worker.shopId)
  const share = Number(settings.partnerShare) || 90
  const rows = await db.serviceBooking.findMany({
    where: { ...partnerBookingsWhere(worker.id), status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    take,
    select: { id: true, code: true, completedAt: true, visitDate: true, finalPrice: true, estimatedPrice: true, extraCharge: true, visitCharge: true, paymentStatus: true, status: true, pricing: true, quoteAmount: true, quoteStatus: true, discount: true, offering: { select: { name: true, nameBn: true } } },
  })
  const ledger: LedgerRow[] = rows.map((r) => {
    const gross = r.finalPrice ?? billFor(r)
    const partner = partnerShare(gross, r.visitCharge, share)
    return { id: r.id, code: r.code, day: (r.completedAt ?? new Date()).toISOString().slice(0, 10), title: r.offering.name, titleBn: r.offering.nameBn, gross, partner, handyo: gross - partner, paid: r.paymentStatus === "PAID", status: r.status }
  })
  const sum = (k: "gross" | "partner" | "handyo") => ledger.reduce((n, r) => n + r[k], 0)
  return { share, rows: ledger, totals: { gross: sum("gross"), partner: sum("partner"), handyo: sum("handyo"), count: ledger.length } }
}

/** Partners of one shop (or all, for the owner) with what they list and how many open orders they hold. */
export async function partnerOverview(shopId: string | null) {
  const list = await db.workerProfile.findMany({
    where: { kind: "PARTNER", ...(shopId ? { shopId } : {}) },
    include: {
      user: { select: { id: true, name: true, phone: true, active: true } },
      stores: { select: { id: true, name: true, nameBn: true, status: true } },
      vehicles: { select: { id: true, status: true } },
      properties: { select: { id: true, status: true } },
      helpers: { select: { id: true, helperStatus: true } },
    },
    orderBy: [{ approved: "asc" }, { joinedAt: "desc" }],
  })
  const open = await Promise.all(list.map((w) => db.serviceBooking.count({ where: { ...partnerBookingsWhere(w.id), status: { notIn: ["COMPLETED", "CANCELLED"] } } })))
  return list.map((w, i) => ({ ...w, openOrders: open[i] }))
}

export { partnerOwns }
