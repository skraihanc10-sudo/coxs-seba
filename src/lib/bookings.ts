import type { Prisma } from "@prisma/client"
import { db } from "./db"
import { AppError } from "./errors"
import { upcomingDays } from "./format"
import { notify, officeIds } from "./notify"
import { getSettings } from "./settings"
import { billFor, estimate, usesQuantity } from "./pricing"
import { quoteCoupon } from "./coupons"
import { paymentProvider } from "./payments"
import type { Role } from "./roles"
import { isTicketCategory, release, reserve } from "./tickets"
import { outsideMessage } from "./shops"
import { staffCanSee } from "./shops-shared"
import {
  canMove,
  customerCanChange,
  flowFor,
  isOpen,
  roleMayMove,
  statusText,
  stepsFor,
  type Flow,
} from "./booking-flow"

export const SLOTS = ["08:00–11:00", "11:00–14:00", "14:00–17:00", "17:00–20:00", "20:00–22:00"]
export const BOOKING_DAYS = 14
export const bookingInclude = {
  shop: { select: { id: true, slug: true, name: true, nameBn: true, city: true, cityBn: true, phone: true, whatsapp: true } },
  customer: { select: { id: true, name: true, phone: true, email: true } },
  category: true,
  offering: true,
  area: true,
  worker: { include: { user: { select: { id: true, name: true, phone: true } } } },
  vehicle: { select: { id: true, title: true, titleBn: true, plate: true, seats: true, photos: true, pricePerHour: true, pricePerDay: true, workerId: true } },
  property: { select: { id: true, name: true, nameBn: true, kind: true, photos: true, addressBn: true, address: true, checkIn: true, checkOut: true, workerId: true } },
  roomType: { select: { id: true, name: true, sleeps: true, pricePerNight: true } },
  items: { orderBy: { id: "asc" } },
  store: { select: { id: true, name: true, nameBn: true, photos: true, workerId: true } },
  events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true, role: true } } } },
  photos: { orderBy: { createdAt: "asc" } },
  review: true,
  payments: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.ServiceBookingInclude

export type BookingFull = Prisma.ServiceBookingGetPayload<{ include: typeof bookingInclude }>

type Viewer = { id: string; role: string; shopId?: string | null; worker?: { id: string; kind?: string } | null }

type Owned = { customerId: string; workerId: string | null; shopId: string; store?: { workerId: string | null } | null; vehicle?: { workerId: string | null } | null; property?: { workerId: string | null } | null }

/** A partner owns a booking when it is assigned to them or placed on their store, vehicle or resort. */
export function partnerOwns(worker: { id: string; kind?: string } | null | undefined, b: Owned) {
  if (!worker) return false
  if (b.workerId === worker.id) return true
  if (worker.kind !== "PARTNER") return false
  return b.store?.workerId === worker.id || b.vehicle?.workerId === worker.id || b.property?.workerId === worker.id
}

const NOT_FOUND = () => new AppError("বুকিংটা পাওয়া যায়নি।", "Booking not found.")

/** Office staff see their own shop's bookings, owners see every shop, customers and workers only their own. */
export function canView(user: Viewer, booking: Owned) {
  if (user.role === "OWNER" || user.role === "ADMIN" || user.role === "SUPPORT") return staffCanSee(user, booking.shopId)
  if (user.role === "CUSTOMER") return booking.customerId === user.id
  if (user.role === "WORKER") return partnerOwns(user.worker, booking)
  return false
}

/** Load a booking for this viewer. Someone else's booking looks exactly like a missing one. */
export async function bookingFor(user: Viewer, code: string) {
  const booking = await db.serviceBooking.findUnique({ where: { code }, include: bookingInclude })
  if (!booking || !canView(user, booking)) throw NOT_FOUND()
  return booking
}

export function flowOf(booking: { category: { flow: string } }): Flow {
  return flowFor(booking.category.flow)
}

/** Fallback letters when a category has no prefix of its own: first two consonants of its slug. */
export function prefixFor(category: { codePrefix: string; slug: string }) {
  if (/^[A-Z]{2,3}$/.test(category.codePrefix)) return category.codePrefix
  const letters = category.slug.replace(/[^a-z]/g, "").toUpperCase()
  return (letters.slice(0, 2) || "HB").padEnd(2, "X")
}

/**
 * Booking numbers: <category prefix>-<serial>. The serial is one running
 * counter shared by every category and every shop, so CL-10001 is followed by
 * CR-10002, LN-10003 … and the list stays in order no matter the category.
 */
export async function newCode(category: { codePrefix: string; slug: string }) {
  const prefix = prefixFor(category)
  for (let i = 0; i < 5; i += 1) {
    const next = await db.$transaction(async (tx) => {
      const row = await tx.sequence.findUnique({ where: { name: "booking" } })
      if (row) return (await tx.sequence.update({ where: { name: "booking" }, data: { value: { increment: 1 } } })).value
      // First booking on this database: continue after the highest number already in use.
      const [{ top }] = await tx.$queryRaw<Array<{ top: number | null }>>`SELECT MAX(CAST(substr(code, instr(code, '-') + 1) AS INTEGER)) AS top FROM "ServiceBooking"`
      const start = Math.max(10000, Number(top ?? 0)) + 1
      return (await tx.sequence.create({ data: { name: "booking", value: start } })).value
    })
    const code = `${prefix}-${next}`
    if (!(await db.serviceBooking.findUnique({ where: { code }, select: { id: true } }))) return code
  }
  throw new AppError("বুকিং নম্বর তৈরি করা যায়নি, আবার চেষ্টা করুন।", "Could not create a booking number. Please try again.")
}

/** Throws the "we only serve <city>" message unless the area is an active area of this shop. */
export async function areaOfShop(shopId: string, areaId: string) {
  const area = areaId ? await db.serviceArea.findFirst({ where: { id: areaId, shopId, active: true }, include: { shop: { select: { city: true, cityBn: true } } } }) : null
  if (!area) {
    const shop = await db.shop.findUnique({ where: { id: shopId }, select: { city: true, cityBn: true } })
    throw outsideMessage(shop ?? { city: "our service area", cityBn: "আমাদের এলাকায়" })
  }
  return area
}

export type NewBooking = {
  offeringId: string
  areaId: string
  addressLine: string
  landmark: string
  phone: string
  contactName: string
  visitDate: string
  visitSlot: string
  notes: string
  quantity: number
  teamSize: number
  days: number
  paymentMethod: string
  vehicleId?: string
  rentalUnit?: "HOUR" | "HALF" | "DAY" | "ROUTE"
  routeId?: string
  couponCode?: string
}

/**
 * Booking rows for a partner with the "direct" privilege: assigned at creation,
 * with the REQUESTED→ASSIGNED trail the office would otherwise write.
 */
export function directAssignData(direct: { id: string; name: string } | null, customerId: string) {
  if (!direct) return { events: { create: { toStatus: "REQUESTED", note: "Booked", actorId: customerId, actorRole: "CUSTOMER" } } }
  return {
    workerId: direct.id,
    status: "ASSIGNED",
    events: { create: [{ toStatus: "REQUESTED", note: "Booked", actorId: customerId, actorRole: "CUSTOMER" }, { fromStatus: "REQUESTED", toStatus: "ASSIGNED", note: `Sent straight to partner ${direct.name}`, actorId: customerId, actorRole: "SYSTEM" }] },
  }
}

export async function createBooking(customer: { id: string; name: string }, input: NewBooking) {
  const offering = await db.serviceOffering.findUnique({ where: { id: input.offeringId }, include: { category: true } })
  if (!offering || !offering.active || !offering.category.active) {
    throw new AppError("এই সেবাটা এখন বন্ধ আছে।", "This service is not available right now.")
  }
  const shopId = offering.category.shopId
  const area = await areaOfShop(shopId, input.areaId)
  if (!upcomingDays(BOOKING_DAYS).includes(input.visitDate)) {
    throw new AppError("আজ থেকে ১৪ দিনের মধ্যে একটা তারিখ বেছে নিন।", "Choose a date within the next 14 days.")
  }
  if (!SLOTS.includes(input.visitSlot)) throw new AppError("একটা সময় বেছে নিন।", "Choose a time slot.")
  const settings = await getSettings(shopId)
  const method = paymentProvider(input.paymentMethod)
  if (!method || settings[method.setting] === "0") {
    throw new AppError("ক্যাশ, বিকাশ বা নগদ থেকে একটা বেছে নিন।", "Choose cash, bKash or Nagad.")
  }
  const custom = offering.category.flow === "CUSTOM"
  if (custom && input.notes.trim().length < 10) {
    throw new AppError("কী কাজ লাগবে, একটু বিস্তারিত লিখুন।", "Tell us a little more about the job.")
  }

  // Rentals: the chosen vehicle sets the rate (by the hour or by the day).
  let pricing = offering.pricing
  let unitPrice = offering.price
  let minQty = offering.minQty
  let vehicleId: string | null = null
  let route: { id: string; name: string } | null = null
  // A partner with the "direct" privilege gets the booking at once, skipping the office transfer.
  let direct: { id: string; userId: string; name: string } | null = null
  if (input.vehicleId) {
    const vehicle = await db.vehicle.findFirst({
      where: { id: input.vehicleId, shopId, offeringId: offering.id, status: "APPROVED", OR: [{ workerId: null }, { worker: { approved: true, user: { active: true } } }] },
      include: { routes: true, worker: { select: { id: true, autoAssign: true, userId: true, user: { select: { name: true } } } } },
    })
    if (!vehicle) throw new AppError("এই গাড়িটা এখন পাওয়া যাচ্ছে না, অন্য একটা বেছে নিন।", "That vehicle is not available right now; pick another.")
    const picked = input.rentalUnit === "ROUTE" && input.routeId ? vehicle.routes.find((r) => r.id === input.routeId) : null
    if (input.rentalUnit === "ROUTE" && !picked) throw new AppError("এই রুট প্যাকেজটা আর নেই, আবার বেছে নিন।", "That route package is gone; pick again.")
    if (picked) route = { id: picked.id, name: picked.name }
    const unit = picked ? "ROUTE" : input.rentalUnit === "HALF" && vehicle.pricePerHalfDay ? "HALF" : input.rentalUnit === "DAY" || !vehicle.pricePerHour ? "DAY" : "HOUR"
    if (unit === "DAY" && !vehicle.pricePerDay) throw new AppError("এই গাড়ি দিনের হিসাবে ভাড়া হয় না।", "This vehicle is not rented by the day.")
    // Half-day (6 hours) is a flat price, so it bills like a fixed job.
    pricing = unit === "HALF" || unit === "ROUTE" ? "FIXED" : unit === "DAY" ? "PER_DAY" : "PER_HOUR"
    unitPrice = picked ? picked.price : unit === "HALF" ? vehicle.pricePerHalfDay : unit === "DAY" ? vehicle.pricePerDay : vehicle.pricePerHour
    minQty = unit === "HOUR" ? vehicle.minHours : 1
    vehicleId = vehicle.id
    if (vehicle.worker?.autoAssign) direct = { id: vehicle.worker.id, userId: vehicle.worker.userId, name: vehicle.worker.user.name }
  }
  const quantity = usesQuantity(pricing) ? Math.max(minQty, input.quantity) : 1
  // Tickets come out of an agent's stock; that agent gets the order directly.
  let ticketStockId: string | null = null
  if (isTicketCategory(offering.category)) {
    const stock = await reserve(offering.id, quantity)
    if (stock) {
      ticketStockId = stock.id
      direct = { id: stock.worker.id, userId: stock.worker.userId, name: stock.worker.user.name }
    }
  }
  const team = offering.category.flow === "TEAM"
  const days = team ? Math.min(30, Math.max(1, input.days)) : 1
  const teamSize = team ? Math.min(20, Math.max(1, input.teamSize)) : 1
  const price = estimate({ pricing, unitPrice, quantity, days, areaCharge: area.charge })
  // A coupon takes its cut off the work price only; the area/visit charge stays.
  const coupon = input.couponCode?.trim() ? await quoteCoupon(shopId, input.couponCode, { categoryId: offering.categoryId, work: price.work, customerId: customer.id }) : null
  const discount = coupon?.discount ?? 0

  const code = await newCode(offering.category)
  const booking = await db.serviceBooking.create({
    data: {
      code,
      shopId,
      customerId: customer.id,
      categoryId: offering.categoryId,
      offeringId: offering.id,
      areaId: area.id,
      addressLine: input.addressLine.trim(),
      landmark: input.landmark.trim(),
      phone: input.phone,
      contactName: input.contactName.trim() || customer.name,
      visitDate: input.visitDate,
      visitSlot: input.visitSlot,
      notes: input.notes.trim(),
      pricing,
      unitPrice,
      vehicleId,
      ticketStockId,
      routeId: route?.id ?? null,
      routeName: route?.name ?? "",
      quantity,
      teamSize,
      days,
      visitCharge: area.charge,
      estimatedPrice: price.total - discount,
      couponId: coupon?.coupon.id ?? null,
      couponCode: coupon?.coupon.code ?? "",
      discount,
      paymentMethod: method.id,
      ...directAssignData(direct, customer.id),
      chat: { create: {} },
    },
    include: bookingInclude,
  })
  if (coupon) await db.coupon.update({ where: { id: coupon.coupon.id }, data: { usedCount: { increment: 1 } } })
  if (direct) await notify([direct.userId], { kind: "BOOKING", title: "নতুন বুকিং এসেছে", body: `${booking.code} · ${offering.nameBn} · ${area.nameBn} · সরাসরি আপনার কাছে।`, link: `/worker/jobs/${booking.code}` })
  await notify([customer.id], {
    kind: "BOOKING",
    title: "বুকিং হয়েছে",
    body: `${booking.code} · ${offering.nameBn}। আমরা শিগগিরই কর্মী ঠিক করে জানাব।`,
    link: `/bookings/${booking.code}`,
  })
  await notify(await officeIds(shopId), {
    kind: "BOOKING",
    title: "নতুন বুকিং",
    body: `${booking.code} · ${offering.nameBn} · ${area.nameBn}`,
    link: `/admin/bookings/${booking.code}`,
  })
  return booking
}

const CUSTOMER_MESSAGES: Record<string, string> = {
  CONFIRMED: "আপনার বুকিং নিশ্চিত হয়েছে।",
  ASSIGNED: "আপনার কাজের জন্য কর্মী ঠিক হয়েছে।",
  ON_THE_WAY: "কর্মী রওনা দিয়েছেন।",
  ARRIVED: "কর্মী পৌঁছে গেছেন।",
  PICKED_UP: "আপনার কাপড় নেওয়া হয়েছে।",
  READY: "আপনার কাপড় রেডি।",
  OUT_FOR_DELIVERY: "কাপড় ডেলিভারিতে বেরিয়েছে।",
  COMPLETED: "কাজ শেষ হয়েছে। রিভিউ দিয়ে জানান কেমন লাগল।",
  CANCELLED: "বুকিংটা বাতিল হয়েছে।",
}

/**
 * Move a booking one step. All status changes in the app go through here.
 * `force` lets an admin/owner put the booking on ANY step of its flow
 * (worker phoned in, wrong tap, refund after completion…); it is logged as an override.
 */
export async function moveBooking(user: Viewer & { role: Role }, code: string, to: string, note = "", opts: { force?: boolean } = {}) {
  const booking = await bookingFor(user, code)
  const flow = flowOf(booking)
  const force = Boolean(opts.force) && (user.role === "ADMIN" || user.role === "OWNER")
  if (force) {
    if (!([...stepsFor(flow), "CANCELLED"] as string[]).includes(to)) throw new AppError("এই ধাপটা এই কাজে নেই।", "That step does not exist for this job.")
    if (to === booking.status) throw new AppError("বুকিং আগে থেকেই এই ধাপে আছে।", "The booking is already on that step.")
  }
  if (!force && !roleMayMove(user.role, to)) {
    throw new AppError("এই ধাপটা আপনি বদলাতে পারবেন না।", "You cannot set that step.")
  }
  if (!force && !canMove(flow, booking.status, to)) {
    throw new AppError(
      `এখন "${statusText(booking.status, "bn")}" থেকে "${statusText(to, "bn")}" করা যাবে না।`,
      `This booking cannot go from "${statusText(booking.status, "en")}" to "${statusText(to, "en")}".`,
    )
  }
  if (user.role === "CUSTOMER" && !customerCanChange(booking.status)) {
    throw new AppError("কর্মী রওনা দেওয়ার পর বাতিল করতে হেল্পলাইনে কল দিন।", "Once the worker is on the way, please call the helpline to cancel.")
  }
  if (to === "ASSIGNED" && !booking.workerId) {
    throw new AppError("আগে একজন কর্মী বেছে নিন।", "Choose a worker first.")
  }
  if (!force && to === "IN_PROGRESS" && booking.pricing === "QUOTE" && booking.quoteStatus !== "ACCEPTED") {
    throw new AppError("কাস্টমার দাম মেনে নিলে তবেই কাজ শুরু করা যাবে।", "Start work after the customer accepts the quote.")
  }
  if (to === "CANCELLED" && note.trim().length < 3) {
    throw new AppError("বাতিলের কারণ লিখুন।", "Add a reason for cancelling.")
  }

  const done = to === "COMPLETED"
  const finalPrice = done ? (booking.finalPrice ?? billFor(booking)) : booking.finalPrice
  const reopened = force && booking.status === "COMPLETED" && !done
  const updated = await db.serviceBooking.update({
    where: { id: booking.id },
    data: {
      status: to,
      ...(to === "CANCELLED" ? { cancelReason: note.trim() } : {}),
      ...(done ? { completedAt: new Date(), finalPrice } : {}),
      ...(reopened ? { completedAt: null } : {}),
      events: {
        create: { fromStatus: booking.status, toStatus: to, note: force ? `Admin override${note.trim() ? ` — ${note.trim()}` : ""}` : note.trim(), actorId: user.id, actorRole: user.role },
      },
    },
  })
  const message = CUSTOMER_MESSAGES[to]
  if (message) {
    await notify([booking.customerId], {
      kind: "BOOKING",
      title: `${booking.code} · ${statusText(to, "bn")}`,
      body: message,
      link: `/bookings/${booking.code}`,
    }, user.id)
  }
  if (to === "CANCELLED") await release(booking)
  if (to === "CANCELLED" && booking.worker) {
    await notify([booking.worker.userId], { kind: "JOB", title: "জব বাতিল", body: `${booking.code} বাতিল হয়েছে।`, link: `/worker` }, user.id)
  }
  if (user.role === "WORKER" || user.role === "CUSTOMER") {
    await notify(await officeIds(booking.shopId), {
      kind: "BOOKING",
      title: `${booking.code} · ${statusText(to, "bn")}`,
      body: `${booking.offering.nameBn} · ${booking.area.nameBn}`,
      link: `/admin/bookings/${booking.code}`,
    })
  }
  return updated
}

/** Office assigns or reassigns a worker. Reassigning resets the job to ASSIGNED for the new worker. */
export async function assignWorker(user: Viewer & { role: Role }, code: string, workerId: string) {
  if (!["ADMIN", "SUPPORT", "OWNER"].includes(user.role)) {
    throw new AppError("কর্মী ঠিক করতে পারে শুধু অফিস।", "Only the office can assign workers.")
  }
  const booking = await bookingFor(user, code)
  if (!["REQUESTED", "CONFIRMED", "ASSIGNED", "ACCEPTED"].includes(booking.status)) {
    throw new AppError("কাজ শুরু হয়ে গেলে কর্মী বদলানো যায় না।", "You can't change the worker once the job has started.")
  }
  const worker = await db.workerProfile.findUnique({
    where: { id: workerId },
    include: { user: true, skills: true },
  })
  if (!worker || !worker.user.active || worker.shopId !== booking.shopId) throw new AppError("এই কর্মী এখন সক্রিয় নন।", "That worker is not active.")
  if (!worker.skills.some((s) => s.categoryId === booking.categoryId)) {
    throw new AppError("এই কর্মীর এই কাজের দক্ষতা দেওয়া নেই।", "This worker does not have the skill for this job.")
  }
  const previous = booking.worker
  await db.serviceBooking.update({
    where: { id: booking.id },
    data: {
      workerId: worker.id,
      status: "ASSIGNED",
      events: {
        create: {
          fromStatus: booking.status,
          toStatus: "ASSIGNED",
          note: previous ? `Reassigned from ${previous.user.name} to ${worker.user.name}` : `Assigned to ${worker.user.name}`,
          actorId: user.id,
          actorRole: user.role,
        },
      },
    },
  })
  if (previous && previous.id !== worker.id) {
    await notify([previous.userId], { kind: "JOB", title: "জব সরানো হয়েছে", body: `${booking.code} অন্য কর্মীকে দেওয়া হয়েছে।`, link: "/worker" })
  }
  await notify([worker.userId], {
    kind: "JOB",
    title: "নতুন জব",
    body: `${booking.code} · ${booking.offering.nameBn} · ${booking.area.nameBn} · ${booking.visitSlot}`,
    link: `/worker/jobs/${booking.code}`,
  })
  await notify([booking.customerId], {
    kind: "BOOKING",
    title: `${booking.code} · কর্মী ঠিক হয়েছে`,
    body: `${worker.user.name} আপনার কাজটা করবেন।`,
    link: `/bookings/${booking.code}`,
  })
}

export async function sendQuote(user: Viewer & { role: Role }, code: string, amount: number, note: string) {
  if (!["WORKER", "ADMIN", "SUPPORT", "OWNER"].includes(user.role)) throw new AppError("দাম পাঠাতে পারে শুধু কর্মী বা অফিস।", "Only workers or the office can send a quote.")
  const booking = await bookingFor(user, code)
  if (booking.pricing !== "QUOTE") throw new AppError("এই কাজের দাম আগেই ঠিক করা আছে।", "This job already has a fixed price.")
  if (!isOpen(booking.status) || booking.status === "IN_PROGRESS") {
    throw new AppError("এই অবস্থায় দাম পাঠানো যাবে না।", "A quote can't be sent at this stage.")
  }
  if (booking.quoteStatus === "ACCEPTED") throw new AppError("কাস্টমার আগেই দাম মেনে নিয়েছেন।", "The customer already accepted a quote.")
  if (!Number.isInteger(amount) || amount < 50 || amount > 500000) {
    throw new AppError("৫০ থেকে ৫,০০,০০০ টাকার মধ্যে দাম দিন।", "Enter a quote between ৳50 and ৳500,000.")
  }
  await db.serviceBooking.update({
    where: { id: booking.id },
    data: {
      quoteAmount: amount,
      quoteStatus: "SENT",
      quoteNote: note.trim(),
      events: { create: { fromStatus: booking.status, toStatus: booking.status, note: `Quote ৳${amount}${note ? ` — ${note.trim()}` : ""}`, actorId: user.id, actorRole: user.role } },
    },
  })
  await notify([booking.customerId], {
    kind: "QUOTE",
    title: `${booking.code} · দাম এসেছে`,
    body: `কাজের দাম ৳${amount}। মেনে নিলে কাজ শুরু হবে।`,
    link: `/bookings/${booking.code}`,
  })
}

export async function answerQuote(user: Viewer & { role: Role }, code: string, accept: boolean) {
  if (user.role !== "CUSTOMER") throw new AppError("দাম মানবেন কি না, সেটা কাস্টমার ঠিক করবেন।", "Only the customer can answer a quote.")
  const booking = await bookingFor(user, code)
  if (booking.quoteStatus !== "SENT" || !booking.quoteAmount) throw new AppError("এখন কোনো দাম অপেক্ষায় নেই।", "There is no quote waiting.")
  if (accept) {
    await db.serviceBooking.update({
      where: { id: booking.id },
      data: {
        quoteStatus: "ACCEPTED",
        estimatedPrice: booking.quoteAmount + booking.visitCharge,
        events: { create: { fromStatus: booking.status, toStatus: booking.status, note: `Quote ৳${booking.quoteAmount} accepted`, actorId: user.id, actorRole: "CUSTOMER" } },
      },
    })
  } else {
    await db.serviceBooking.update({
      where: { id: booking.id },
      data: {
        quoteStatus: "DECLINED",
        status: "CANCELLED",
        cancelReason: "Customer declined the quote",
        events: { create: { fromStatus: booking.status, toStatus: "CANCELLED", note: "Customer declined the quote", actorId: user.id, actorRole: "CUSTOMER" } },
      },
    })
  }
  await notify([booking.worker?.userId, ...(await officeIds(booking.shopId))], {
    kind: "QUOTE",
    title: `${booking.code} · ${accept ? "দাম মেনে নিয়েছেন" : "দাম মানেননি"}`,
    body: accept ? "কাজ শুরু করা যাবে।" : "বুকিং বাতিল হয়েছে।",
    link: booking.worker ? `/worker/jobs/${booking.code}` : `/admin/bookings/${booking.code}`,
  })
}

export async function reschedule(user: Viewer & { role: Role }, code: string, visitDate: string, visitSlot: string) {
  const booking = await bookingFor(user, code)
  const office = user.role === "ADMIN" || user.role === "SUPPORT" || user.role === "OWNER"
  if (!office && user.role !== "CUSTOMER") throw new AppError("সময় বদলাতে পারবেন না।", "You can't change the time.")
  if (!customerCanChange(booking.status)) throw new AppError("কর্মী রওনা দেওয়ার পর সময় বদলানো যায় না।", "The time can't change once the worker is on the way.")
  if (!office && booking.rescheduled >= 2) throw new AppError("দুবারের বেশি সময় বদলানো যায় না। হেল্পলাইনে কল দিন।", "You can reschedule twice. Please call the helpline.")
  if (!upcomingDays(BOOKING_DAYS).includes(visitDate) || !SLOTS.includes(visitSlot)) {
    throw new AppError("নতুন তারিখ আর সময় বেছে নিন।", "Choose a new date and time.")
  }
  await db.serviceBooking.update({
    where: { id: booking.id },
    data: {
      visitDate,
      visitSlot,
      rescheduled: { increment: office ? 0 : 1 },
      events: { create: { fromStatus: booking.status, toStatus: booking.status, note: `Rescheduled to ${visitDate} ${visitSlot}`, actorId: user.id, actorRole: user.role } },
    },
  })
  await notify([booking.customerId, booking.worker?.userId], {
    kind: "BOOKING",
    title: `${booking.code} · সময় বদলেছে`,
    body: `নতুন সময়: ${visitDate}, ${visitSlot}`,
    link: `/bookings/${booking.code}`,
  }, user.id)
}

/** Laundry riders weigh the clothes at pickup; the bill follows the real weight. */
export async function setQuantity(user: Viewer & { role: Role }, code: string, quantity: number) {
  const booking = await bookingFor(user, code)
  if (!["WORKER", "ADMIN", "SUPPORT", "OWNER"].includes(user.role)) throw new AppError("পরিমাণ বদলাতে পারবেন না।", "You can't change the quantity.")
  if (!usesQuantity(booking.pricing)) throw new AppError("এই কাজে পরিমাণ লাগে না।", "This job has no quantity.")
  if (!isOpen(booking.status)) throw new AppError("বুকিংটা বন্ধ হয়ে গেছে।", "This booking is closed.")
  if (!(quantity > 0 && quantity <= 500)) throw new AppError("সঠিক পরিমাণ দিন।", "Enter a valid quantity.")
  const price = estimate({ pricing: booking.pricing, unitPrice: booking.unitPrice, quantity, days: booking.days, areaCharge: booking.visitCharge })
  await db.serviceBooking.update({
    where: { id: booking.id },
    data: {
      quantity,
      estimatedPrice: price.total,
      events: { create: { fromStatus: booking.status, toStatus: booking.status, note: `Quantity set to ${quantity} → ৳${price.total}`, actorId: user.id, actorRole: user.role } },
    },
  })
}

export async function setPrice(user: Viewer & { role: Role }, code: string, finalPrice: number, note: string) {
  if (user.role !== "ADMIN" && user.role !== "OWNER") throw new AppError("দাম বদলাতে পারে শুধু অ্যাডমিন।", "Only an admin can change the price.")
  const booking = await bookingFor(user, code)
  if (!Number.isInteger(finalPrice) || finalPrice < 0) throw new AppError("সঠিক দাম দিন।", "Enter a valid price.")
  await db.serviceBooking.update({
    where: { id: booking.id },
    data: {
      finalPrice,
      ...(booking.status === "COMPLETED" ? {} : { estimatedPrice: finalPrice }),
      adminNote: note.trim() || booking.adminNote,
      events: { create: { fromStatus: booking.status, toStatus: booking.status, note: `Price set to ৳${finalPrice}${note ? ` — ${note.trim()}` : ""}`, actorId: user.id, actorRole: user.role } },
    },
  })
}

/**
 * The office adds or takes money off a bill: an extra charge (parts, a longer trip,
 * more pieces) or a reduction. Negative numbers reduce the bill. Logged on the booking.
 */
export async function adjustBill(user: Viewer & { role: Role }, code: string, extraCharge: number, note: string) {
  if (user.role !== "ADMIN" && user.role !== "OWNER") throw new AppError("বিল বদলাতে পারে শুধু অ্যাডমিন।", "Only an admin can adjust the bill.")
  const booking = await bookingFor(user, code)
  if (!Number.isInteger(extraCharge) || Math.abs(extraCharge) > 500000) throw new AppError("সঠিক টাকার অঙ্ক দিন।", "Enter a valid amount.")
  if (booking.paymentStatus === "PAID") throw new AppError("পেমেন্ট হয়ে যাওয়া বিল বদলানো যায় না।", "A paid bill cannot change.")
  const next = { ...booking, extraCharge }
  const bill = billFor(next)
  await db.serviceBooking.update({
    where: { id: booking.id },
    data: {
      extraCharge,
      extraNote: note.trim(),
      ...(booking.status === "COMPLETED" ? { finalPrice: bill } : {}),
      events: { create: { fromStatus: booking.status, toStatus: booking.status, note: `Bill adjusted ${extraCharge >= 0 ? "+" : ""}৳${extraCharge} → ৳${bill}${note.trim() ? ` — ${note.trim()}` : ""}`, actorId: user.id, actorRole: user.role } },
    },
  })
  await notify([booking.customerId], { kind: "BOOKING", title: `${booking.code} · বিল আপডেট`, body: `${extraCharge >= 0 ? "যোগ" : "কম"} হয়েছে ৳${Math.abs(extraCharge)}${note.trim() ? ` (${note.trim()})` : ""}। এখন মোট ৳${bill}।`, link: `/bookings/${booking.code}` }, user.id)
  return bill
}

export async function setRefundNote(user: Viewer & { role: Role }, code: string, note: string) {
  if (!["ADMIN", "SUPPORT", "OWNER"].includes(user.role)) throw new AppError("অনুমতি নেই।", "Not allowed.")
  const booking = await bookingFor(user, code)
  await db.serviceBooking.update({
    where: { id: booking.id },
    data: {
      refundNote: note.trim(),
      events: { create: { fromStatus: booking.status, toStatus: booking.status, note: `Refund note: ${note.trim()}`, actorId: user.id, actorRole: user.role } },
    },
  })
}

export async function recordPayment(user: Viewer & { role: Role }, code: string, method: string, reference: string) {
  if (!["WORKER", "ADMIN", "SUPPORT", "OWNER"].includes(user.role)) throw new AppError("অনুমতি নেই।", "Not allowed.")
  const booking = await bookingFor(user, code)
  if (booking.status !== "COMPLETED") throw new AppError("কাজ শেষ হলে টাকা নেওয়া হিসাব করুন।", "Record payment after the job is completed.")
  if (booking.paymentStatus === "PAID") throw new AppError("টাকা আগেই নেওয়া হয়েছে।", "Payment is already recorded.")
  const provider = paymentProvider(method)
  if (!provider) throw new AppError("পেমেন্টের ধরন বেছে নিন।", "Choose a payment method.")
  const amount = booking.finalPrice ?? billFor(booking)
  await db.serviceBooking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: "PAID",
      paymentMethod: provider.id,
      payments: { create: { provider: provider.id, amount, reference: reference.trim() } },
      events: { create: { fromStatus: booking.status, toStatus: booking.status, note: `Paid ৳${amount} by ${provider.label}${reference ? ` (${reference.trim()})` : ""}`, actorId: user.id, actorRole: user.role } },
    },
  })
}

export async function reviewBooking(user: Viewer & { role: Role }, code: string, rating: number, comment: string) {
  if (user.role !== "CUSTOMER") throw new AppError("রিভিউ দেবেন কাস্টমার।", "Only customers can review.")
  const booking = await bookingFor(user, code)
  if (booking.status !== "COMPLETED") throw new AppError("কাজ শেষ হলে রিভিউ দিন।", "You can review once the job is done.")
  if (booking.review) throw new AppError("এই কাজের রিভিউ আগেই দিয়েছেন।", "You already reviewed this job.")
  await db.bookingReview.create({
    data: { bookingId: booking.id, customerId: user.id, workerId: booking.workerId, rating, comment: comment.trim() },
  })
  if (booking.workerId) {
    const agg = await db.bookingReview.aggregate({ where: { workerId: booking.workerId }, _avg: { rating: true }, _count: true })
    await db.workerProfile.update({
      where: { id: booking.workerId },
      data: { rating: Math.round((agg._avg.rating ?? rating) * 10) / 10, ratingCount: agg._count },
    })
  }
  await notify([booking.worker?.userId, ...(await officeIds(booking.shopId))], {
    kind: "REVIEW",
    title: `${booking.code} · ${rating}★ রিভিউ`,
    body: comment.trim().slice(0, 120),
    link: `/admin/bookings/${booking.code}`,
  })
}

export async function addPhotos(user: Viewer & { role: Role }, code: string, kind: "CUSTOMER" | "BEFORE" | "AFTER", paths: string[]) {
  const booking = await bookingFor(user, code)
  if (kind !== "CUSTOMER" && user.role !== "WORKER" && user.role !== "ADMIN" && user.role !== "OWNER") {
    throw new AppError("কাজের ছবি দেবেন কর্মী।", "Only the worker adds job photos.")
  }
  if (booking.photos.length + paths.length > 20) throw new AppError("একটা বুকিংয়ে ২০টার বেশি ছবি রাখা যায় না।", "A booking can hold up to 20 photos.")
  await db.bookingPhoto.createMany({ data: paths.map((path) => ({ bookingId: booking.id, kind, path, uploadedById: user.id })) })
}

/** Worker's money: their share of each completed job. */
export function workerShare(finalPrice: number, visitCharge: number, percent: number) {
  return Math.round(Math.max(0, finalPrice - visitCharge) * (percent / 100) + visitCharge * 0.5)
}
