import { db } from "./db"

/** Worker choices for the assign dropdown, with skill and area hints. Only this shop's team. */
export async function workerOptions(shopId: string, categoryId: string, areaId: string) {
  const workers = await db.workerProfile.findMany({
    where: { shopId, user: { active: true } },
    include: {
      user: { select: { name: true } },
      skills: { select: { categoryId: true } },
      areas: { select: { areaId: true } },
      bookings: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, select: { id: true } },
    },
  })
  return workers.map((w) => ({
    id: w.id,
    name: w.user.name,
    rating: w.rating,
    busy: w.bookings.length,
    skilled: w.skills.some((s) => s.categoryId === categoryId),
    inArea: !w.areas.length || w.areas.some((a) => a.areaId === areaId),
  }))
}

export async function replyTemplates(shopId: string) {
  return db.replyTemplate.findMany({ where: { shopId }, orderBy: { sort: "asc" } })
}

export const STATUS_FILTERS = ["", "REQUESTED", "CONFIRMED", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "PICKED_UP", "AT_LAUNDRY", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"]

export type BookingFilter = { status?: string; category?: string; area?: string; from?: string; to?: string; q?: string; worker?: string }

/** Filtered booking list for the office pages of one shop. */
export async function listBookings(shopId: string, f: BookingFilter, take = 200) {
  const iso = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)
  const q = f.q?.trim()
  return db.serviceBooking.findMany({
    where: {
      shopId,
      ...(f.status ? { status: f.status } : {}),
      ...(f.category ? { categoryId: f.category } : {}),
      ...(f.area ? { areaId: f.area } : {}),
      ...(f.worker ? { workerId: f.worker } : {}),
      ...(iso(f.from) || iso(f.to) ? { visitDate: { ...(iso(f.from) ? { gte: iso(f.from) } : {}), ...(iso(f.to) ? { lte: iso(f.to) } : {}) } } : {}),
      ...(q ? { OR: [{ code: { contains: q } }, { phone: { contains: q } }, { contactName: { contains: q } }, { customer: { name: { contains: q } } }, { addressLine: { contains: q } }] } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take,
    include: { customer: { select: { name: true } }, category: true, offering: true, area: true, worker: { include: { user: { select: { name: true } } } } },
  })
}
