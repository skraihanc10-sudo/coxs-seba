import { db } from "./db"
import { dayStart, localDate, localToday, recentDays, shiftDays } from "./format"
import { getSettings } from "./settings"
import { workerShare } from "./bookings"
import { partnerShare } from "./vehicles"

/** What the assigned worker earns from one completed job: partners (vehicle owners) get the rental share, staff the job share. */
function payFor(r: { workerId: string | null; visitCharge: number; worker?: { kind: string } | null }, price: number, shares: { worker: number; partner: number }) {
  if (!r.workerId) return 0
  return r.worker?.kind === "PARTNER" ? partnerShare(price, r.visitCharge, shares.partner) : workerShare(price, r.visitCharge, shares.worker)
}

function sharesOf(settings: Record<string, string>) {
  return { worker: Number(settings.workerShare) || 40, partner: Number(settings.partnerShare) || 85 }
}

export type Period = "today" | "week" | "month" | "year" | "custom"

export function periodRange(period: Period, from?: string, to?: string) {
  const today = localToday()
  let start = today
  let end = today
  if (period === "week") start = shiftDays(today, -6)
  if (period === "month") start = `${today.slice(0, 7)}-01`
  if (period === "year") start = `${today.slice(0, 4)}-01-01`
  if (period === "custom" && from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    start = from
    end = to && /^\d{4}-\d{2}-\d{2}$/.test(to) && to >= from ? to : from
  }
  return { start, end, gte: dayStart(start), lt: dayStart(shiftDays(end, 1)) }
}

export function parsePeriod(value?: string): Period {
  return value === "week" || value === "month" || value === "year" || value === "custom" ? value : "today"
}

const RUNNING = ["CONFIRMED", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "PICKED_UP", "AT_LAUNDRY", "READY", "OUT_FOR_DELIVERY"]

/** One shop's dashboard numbers. Every count below is scoped to `shopId`. */
export async function dashboard(shopId: string, period: Period, from?: string, to?: string) {
  const range = periodRange(period, from, to)
  const chartDays = recentDays(period === "today" || period === "week" ? 7 : 30)
  const chartStart = dayStart(chartDays[0])

  const [booked, completed, chartRows, running, waiting, openTickets, urgentTickets, customers, workers, recent, careOpen] = await Promise.all([
    db.serviceBooking.findMany({
      where: { shopId, createdAt: { gte: range.gte, lt: range.lt } },
      select: { status: true, categoryId: true, areaId: true },
    }),
    db.serviceBooking.findMany({
      where: { shopId, status: "COMPLETED", completedAt: { gte: range.gte, lt: range.lt } },
      select: { finalPrice: true, estimatedPrice: true, categoryId: true, areaId: true },
    }),
    db.serviceBooking.findMany({
      where: { shopId, status: "COMPLETED", completedAt: { gte: chartStart } },
      select: { finalPrice: true, estimatedPrice: true, completedAt: true },
    }),
    db.serviceBooking.count({ where: { shopId, status: { in: RUNNING } } }),
    db.serviceBooking.count({ where: { shopId, status: "REQUESTED" } }),
    db.ticket.count({ where: { shopId, status: { in: ["OPEN", "PENDING"] } } }),
    db.ticket.count({ where: { shopId, status: { in: ["OPEN", "PENDING"] }, priority: { in: ["HIGH", "URGENT"] } } }),
    db.user.count({ where: { role: "CUSTOMER", bookings: { some: { shopId } } } }),
    db.workerProfile.findMany({
      where: { shopId, user: { active: true } },
      include: {
        user: { select: { name: true } },
        skills: { include: { category: { select: { nameBn: true, name: true } } } },
        bookings: {
          where: { status: { in: RUNNING } },
          select: { code: true, status: true, area: { select: { nameBn: true, name: true } } },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { rating: "desc" },
    }),
    db.serviceBooking.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: { select: { name: true } }, offering: true, area: true, category: { select: { flow: true } } },
    }),
    db.careThread.count({ where: { shopId, status: "OPEN", messages: { some: {} } } }),
  ])

  const amount = (r: { finalPrice: number | null; estimatedPrice: number }) => r.finalPrice ?? r.estimatedPrice
  const revenue = completed.reduce((s, r) => s + amount(r), 0)
  const byStatus: Record<string, number> = {}
  for (const b of booked) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1

  const [categories, areas] = await Promise.all([
    db.serviceCategory.findMany({ where: { shopId }, select: { id: true, name: true, nameBn: true, icon: true } }),
    db.serviceArea.findMany({ where: { shopId }, select: { id: true, name: true, nameBn: true } }),
  ])
  const top = <T extends { id: string }>(rows: T[], key: "categoryId" | "areaId") =>
    rows
      .map((row) => ({
        ...row,
        bookings: booked.filter((b) => b[key] === row.id).length,
        revenue: completed.filter((b) => b[key] === row.id).reduce((s, r) => s + amount(r), 0),
      }))
      .filter((r) => r.bookings || r.revenue)
      .sort((a, b) => b.bookings - a.bookings || b.revenue - a.revenue)
      .slice(0, 6)

  const series = chartDays.map((day) => ({
    day,
    revenue: chartRows.filter((r) => r.completedAt && localDate(r.completedAt) === day).reduce((s, r) => s + amount(r), 0),
  }))

  return {
    range,
    revenue,
    bookings: booked.length,
    completedCount: completed.length,
    running,
    waiting,
    openTickets,
    urgentTickets,
    careOpen,
    customers,
    workerCount: workers.length,
    busyWorkers: workers.filter((w) => w.bookings.length).length,
    byStatus,
    topServices: top(categories, "categoryId"),
    topAreas: top(areas, "areaId"),
    series,
    workers,
    recent,
  }
}

export type ReportGroup = "day" | "week" | "month" | "service" | "worker" | "area"

/** Completed-job revenue of one shop grouped for the reports page and CSV export. */
export async function report(shopId: string, range: { gte: Date; lt: Date }, group: ReportGroup) {
  const settings = await getSettings(shopId)
  const shares = sharesOf(settings)
  const share = shares.worker
  const rows = await db.serviceBooking.findMany({
    where: { shopId, status: "COMPLETED", completedAt: { gte: range.gte, lt: range.lt } },
    include: {
      category: { select: { name: true, nameBn: true } },
      area: { select: { name: true, nameBn: true } },
      worker: { select: { kind: true, user: { select: { name: true } } } },
    },
    orderBy: { completedAt: "asc" },
  })
  const groups = new Map<string, { key: string; label: string; labelBn: string; jobs: number; revenue: number; workerPay: number; cash: number; mobile: number }>()
  for (const r of rows) {
    const day = localDate(r.completedAt!)
    let key = day
    let label = day
    let labelBn = day
    if (group === "week") {
      const d = new Date(`${day}T00:00:00Z`)
      const monday = shiftDays(day, -((d.getUTCDay() + 6) % 7))
      key = monday
      label = `Week of ${monday}`
      labelBn = `${monday} থেকে সপ্তাহ`
    } else if (group === "month") {
      key = day.slice(0, 7)
      label = key
      labelBn = key
    } else if (group === "service") {
      key = r.categoryId
      label = r.category.name
      labelBn = r.category.nameBn
    } else if (group === "worker") {
      key = r.workerId ?? "none"
      label = r.worker?.user.name ?? "Unassigned"
      labelBn = r.worker?.user.name ?? "কর্মী নেই"
    } else if (group === "area") {
      key = r.areaId
      label = r.area.name
      labelBn = r.area.nameBn
    }
    const price = r.finalPrice ?? r.estimatedPrice
    const g = groups.get(key) ?? { key, label, labelBn, jobs: 0, revenue: 0, workerPay: 0, cash: 0, mobile: 0 }
    g.jobs += 1
    g.revenue += price
    g.workerPay += payFor(r, price, shares)
    if (r.paymentMethod === "CASH") g.cash += price
    else g.mobile += price
    groups.set(key, g)
  }
  const list = [...groups.values()]
  if (group === "service" || group === "worker" || group === "area") list.sort((a, b) => b.revenue - a.revenue)
  const total = list.reduce(
    (t, g) => ({ jobs: t.jobs + g.jobs, revenue: t.revenue + g.revenue, workerPay: t.workerPay + g.workerPay, cash: t.cash + g.cash, mobile: t.mobile + g.mobile }),
    { jobs: 0, revenue: 0, workerPay: 0, cash: 0, mobile: 0 },
  )
  return { rows: list, total, share }
}

/** Owner's view: every shop side by side, separate books. */
export async function ownerOverview(range: { gte: Date; lt: Date }) {
  const shops = await db.shop.findMany({
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { workers: true, areas: true, categories: true } },
      users: { where: { role: { in: ["ADMIN", "SUPPORT"] }, active: true }, select: { id: true, name: true, role: true, email: true } },
    },
  })
  const rows = await Promise.all(
    shops.map(async (shop) => {
      const [booked, completed, running, waiting, tickets, settings] = await Promise.all([
        db.serviceBooking.count({ where: { shopId: shop.id, createdAt: { gte: range.gte, lt: range.lt } } }),
        db.serviceBooking.findMany({
          where: { shopId: shop.id, status: "COMPLETED", completedAt: { gte: range.gte, lt: range.lt } },
          select: { finalPrice: true, estimatedPrice: true, visitCharge: true, workerId: true, paymentMethod: true, worker: { select: { kind: true } } },
        }),
        db.serviceBooking.count({ where: { shopId: shop.id, status: { in: RUNNING } } }),
        db.serviceBooking.count({ where: { shopId: shop.id, status: "REQUESTED" } }),
        db.ticket.count({ where: { shopId: shop.id, status: { in: ["OPEN", "PENDING"] } } }),
        getSettings(shop.id),
      ])
      const shares = sharesOf(settings)
      const revenue = completed.reduce((s, r) => s + (r.finalPrice ?? r.estimatedPrice), 0)
      const workerPay = completed.reduce((s, r) => s + payFor(r, r.finalPrice ?? r.estimatedPrice, shares), 0)
      const cash = completed.filter((r) => r.paymentMethod === "CASH").reduce((s, r) => s + (r.finalPrice ?? r.estimatedPrice), 0)
      return { shop, booked, completed: completed.length, revenue, workerPay, margin: revenue - workerPay, cash, mobile: revenue - cash, running, waiting, tickets }
    }),
  )
  const total = rows.reduce(
    (t, r) => ({ booked: t.booked + r.booked, completed: t.completed + r.completed, revenue: t.revenue + r.revenue, workerPay: t.workerPay + r.workerPay, margin: t.margin + r.margin, running: t.running + r.running, waiting: t.waiting + r.waiting, tickets: t.tickets + r.tickets }),
    { booked: 0, completed: 0, revenue: 0, workerPay: 0, margin: 0, running: 0, waiting: 0, tickets: 0 },
  )
  return { rows, total }
}

function csvCell(value: string | number) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(header: string[], rows: Array<Array<string | number>>) {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")
}
