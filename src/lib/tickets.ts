import type { Prisma } from "@prisma/client"
import { db } from "./db"
import { AppError } from "./errors"
import { notify, officeIds } from "./notify"
import type { Role } from "./roles"

/**
 * Ticket stock. An agent (partner) tells us how many tickets of each type
 * they hold; bookings take from that stock and the agent gets the order.
 * When every agent's stock for a type is gone, the type shows "stock out".
 */

/** Categories whose offerings are sold from partner ticket stock. */
export const TICKET_SLUGS = ["saint-martin-ship"]

export const isTicketCategory = (c: { slug: string }) => TICKET_SLUGS.includes(c.slug)

export const STOCK_STATUS_TEXT: Record<string, { bn: string; en: string }> = {
  PENDING: { bn: "অনুমোদনের অপেক্ষায়", en: "Waiting for approval" },
  APPROVED: { bn: "চালু", en: "Live" },
  PAUSED: { bn: "স্টক আউট (বন্ধ)", en: "Stock out (paused)" },
  REJECTED: { bn: "বাতিল", en: "Rejected" },
}

type Viewer = { id: string; role: string; shopId?: string | null; worker?: { id: string; kind?: string } | null }

const liveStock: Prisma.TicketStockWhereInput = { status: "APPROVED", worker: { approved: true, user: { active: true } } }

/**
 * Tickets left per offering id, counting every live agent. An offering no
 * agent has ever stocked is absent from the map: the office sells it directly.
 */
export async function availability(offeringIds: string[]) {
  const rows = await db.ticketStock.findMany({ where: { offeringId: { in: offeringIds }, status: { in: ["APPROVED", "PAUSED"] }, worker: { approved: true, user: { active: true } } }, select: { offeringId: true, qty: true, sold: true, status: true } })
  const left = new Map<string, number>()
  for (const r of rows) left.set(r.offeringId, (left.get(r.offeringId) ?? 0) + (r.status === "APPROVED" ? Math.max(0, r.qty - r.sold) : 0))
  return left
}

/** Take `n` tickets of one type from the first agent who has enough. Returns the stock and its agent. */
export async function reserve(offeringId: string, n: number) {
  const stocks = await db.ticketStock.findMany({ where: { ...liveStock, offeringId }, include: { worker: { select: { id: true, userId: true, user: { select: { name: true } } } } }, orderBy: { createdAt: "asc" } })
  // Nobody has ever stocked this type: the office sells it the usual way.
  if (!(await db.ticketStock.count({ where: { offeringId, status: { in: ["APPROVED", "PAUSED"] }, worker: { approved: true, user: { active: true } } } }))) return null
  const total = stocks.reduce((s, r) => s + Math.max(0, r.qty - r.sold), 0)
  if (!total) throw new AppError("এই টিকিট এখন স্টক আউট। অন্য ক্লাস বেছে নিন বা হেল্পলাইনে কল দিন।", "This ticket is out of stock. Pick another class or call the helpline.")
  // The agent holding the most tickets sells first, so stock spreads across agents.
  const stock = [...stocks].sort((a, b) => (b.qty - b.sold) - (a.qty - a.sold)).find((r) => r.qty - r.sold >= n)
  if (!stock) throw new AppError(`এখন একসাথে সর্বোচ্চ ${Math.max(...stocks.map((r) => r.qty - r.sold))}টা টিকিট আছে।`, `Only ${Math.max(...stocks.map((r) => r.qty - r.sold))} tickets are left together right now.`)
  const updated = await db.ticketStock.updateMany({ where: { id: stock.id, sold: stock.sold }, data: { sold: { increment: n } } })
  if (!updated.count) throw new AppError("টিকিট কাটার সময় স্টক বদলে গেছে, আবার চেষ্টা করুন।", "Stock changed while booking; please try again.")
  return stock
}

/** Give tickets back when a booking is cancelled. */
export async function release(booking: { ticketStockId: string | null; quantity: number }) {
  if (!booking.ticketStockId) return
  const s = await db.ticketStock.findUnique({ where: { id: booking.ticketStockId }, select: { sold: true } })
  if (!s) return
  await db.ticketStock.update({ where: { id: booking.ticketStockId }, data: { sold: Math.max(0, s.sold - booking.quantity) } })
}

/* ---------- partner (agent) ---------- */

export const stockInclude = {
  offering: { select: { id: true, name: true, nameBn: true, price: true, pricing: true, category: { select: { slug: true, name: true, nameBn: true, icon: true, image: true } } } },
  worker: { select: { id: true, businessName: true, user: { select: { name: true, phone: true } } } },
} satisfies Prisma.TicketStockInclude

export async function agentStocks(workerId: string) {
  return db.ticketStock.findMany({ where: { workerId }, include: stockInclude, orderBy: [{ status: "asc" }, { createdAt: "desc" }] })
}

/** Ticket types an agent may stock: every active offering of the ticket categories in their branch. */
export async function ticketOfferings(shopId: string) {
  return db.serviceOffering.findMany({ where: { active: true, category: { shopId, active: true, slug: { in: TICKET_SLUGS } } }, orderBy: { sort: "asc" }, select: { id: true, name: true, nameBn: true, price: true, pricing: true } })
}

export async function addStock(user: Viewer, input: { offeringId: string; qty: number; note: string }, photos: string[]) {
  if (user.role !== "WORKER" || !user.worker || user.worker.kind !== "PARTNER") throw new AppError("শুধু পার্টনার এজেন্ট স্টক দিতে পারেন।", "Only a partner agent can add stock.")
  const worker = await db.workerProfile.findUnique({ where: { id: user.worker.id }, select: { id: true, shopId: true, user: { select: { name: true } } } })
  if (!worker) throw new AppError("পার্টনার পাওয়া যায়নি।", "Partner not found.")
  const offering = await db.serviceOffering.findFirst({ where: { id: input.offeringId, active: true, category: { shopId: worker.shopId, slug: { in: TICKET_SLUGS } } }, select: { id: true, nameBn: true } })
  if (!offering) throw new AppError("এই টিকিটের ধরন পাওয়া যায়নি।", "That ticket type was not found.")
  const qty = Math.floor(input.qty)
  if (!(qty >= 1 && qty <= 5000)) throw new AppError("কতগুলো টিকিট আছে, ১ থেকে ৫০০০-এর মধ্যে লিখুন।", "Enter how many tickets you hold (1 to 5000).")
  const existing = await db.ticketStock.findFirst({ where: { workerId: worker.id, offeringId: offering.id, status: { not: "REJECTED" } } })
  if (existing) throw new AppError("এই ধরনের স্টক আগেই আছে; তালিকা থেকে সংখ্যা বদলান।", "You already stock this type; change the number in the list.")
  const row = await db.ticketStock.create({ data: { shopId: worker.shopId, workerId: worker.id, offeringId: offering.id, qty, note: input.note.trim().slice(0, 300), photos: photos.join(","), status: "PENDING" } })
  await notify(await officeIds(worker.shopId), { kind: "SYSTEM", title: "টিকিট স্টক অনুমোদনের অপেক্ষায়", body: `${worker.user.name} · ${offering.nameBn} · ${qty}টা`, link: "/admin/tickets" })
  return row
}

/** The agent updates how many they hold, or pauses (stock out) / resumes. */
export async function updateStock(user: Viewer, id: string, patch: { qty?: number; toggle?: boolean }) {
  if (user.role !== "WORKER" || !user.worker) throw new AppError("অনুমতি নেই।", "Not allowed.")
  const row = await db.ticketStock.findFirst({ where: { id, workerId: user.worker.id } })
  if (!row) throw new AppError("স্টক পাওয়া যায়নি।", "Stock not found.")
  const data: Prisma.TicketStockUpdateInput = {}
  if (patch.qty != null) {
    const qty = Math.floor(patch.qty)
    if (!(qty >= 0 && qty <= 5000)) throw new AppError("০ থেকে ৫০০০-এর মধ্যে লিখুন।", "Enter 0 to 5000.")
    if (qty < row.sold) throw new AppError(`${row.sold}টা আগেই বিক্রি হয়েছে, তার কমে নামানো যাবে না।`, `${row.sold} are already sold; it cannot go below that.`)
    data.qty = qty
    if (row.status === "REJECTED") { data.status = "PENDING"; data.rejectNote = "" }
  }
  if (patch.toggle) {
    if (row.status !== "APPROVED" && row.status !== "PAUSED") throw new AppError("অনুমোদনের পর চালু/বন্ধ করা যাবে।", "You can pause it once it is approved.")
    data.status = row.status === "APPROVED" ? "PAUSED" : "APPROVED"
  }
  return db.ticketStock.update({ where: { id }, data })
}

/* ---------- office ---------- */

export async function shopStocks(shopId: string | null) {
  return db.ticketStock.findMany({ where: shopId ? { shopId } : {}, include: stockInclude, orderBy: [{ status: "asc" }, { createdAt: "desc" }] })
}

export async function reviewStock(user: Viewer & { role: Role }, id: string, decision: "APPROVE" | "REJECT" | "PAUSE" | "RESUME", note = "") {
  if (user.role !== "ADMIN" && user.role !== "OWNER") throw new AppError("অনুমতি নেই।", "Not allowed.")
  const row = await db.ticketStock.findUnique({ where: { id }, include: { worker: { select: { userId: true } }, offering: { select: { nameBn: true } } } })
  if (!row || (user.role !== "OWNER" && user.shopId !== row.shopId)) throw new AppError("স্টক পাওয়া যায়নি।", "Stock not found.")
  const status = decision === "APPROVE" || decision === "RESUME" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "PAUSED"
  await db.ticketStock.update({ where: { id }, data: { status, rejectNote: decision === "REJECT" ? note.trim() : "" } })
  await notify([row.worker.userId], {
    kind: "SYSTEM",
    title: decision === "APPROVE" ? `টিকিট স্টক অনুমোদিত: ${row.offering.nameBn}` : decision === "REJECT" ? `টিকিট স্টক নাকচ: ${row.offering.nameBn}` : `টিকিট স্টক ${status === "PAUSED" ? "বন্ধ" : "চালু"}: ${row.offering.nameBn}`,
    body: decision === "APPROVE" ? "এখন সাইটে বিক্রি হচ্ছে; অর্ডার আপনার প্যানেলে আসবে।" : decision === "REJECT" ? note.trim() || "অফিস অনুমোদন দেয়নি।" : "",
    link: "/worker/tickets",
  })
}
