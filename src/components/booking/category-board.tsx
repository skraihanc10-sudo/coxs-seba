import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { db } from "@/lib/db"
import { named, pick } from "@/lib/i18n"
import type { Locale } from "@/lib/format"
import { CategoryIcon } from "@/components/category-icon"
import { prefixFor } from "@/lib/bookings"

const RUNNING = ["CONFIRMED", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "PICKED_UP", "AT_LAUNDRY", "READY", "OUT_FOR_DELIVERY"]

export type CategoryCount = {
  id: string
  slug: string
  name: string
  nameBn: string
  icon: string
  prefix: string
  total: number
  waiting: number
  running: number
  completed: number
  cancelled: number
}

/** Booking counts per category for one shop. */
export async function categoryCounts(shopId: string): Promise<CategoryCount[]> {
  const [categories, groups] = await Promise.all([
    db.serviceCategory.findMany({ where: { shopId }, orderBy: { sort: "asc" }, select: { id: true, slug: true, name: true, nameBn: true, icon: true, codePrefix: true } }),
    db.serviceBooking.groupBy({ by: ["categoryId", "status"], where: { shopId }, _count: { _all: true } }),
  ])
  return categories.map((c) => {
    const rows = groups.filter((g) => g.categoryId === c.id)
    const sum = (test: (status: string) => boolean) => rows.filter((g) => test(g.status)).reduce((s, g) => s + g._count._all, 0)
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      nameBn: c.nameBn,
      icon: c.icon,
      prefix: prefixFor(c),
      total: sum(() => true),
      waiting: sum((s) => s === "REQUESTED"),
      running: sum((s) => RUNNING.includes(s)),
      completed: sum((s) => s === "COMPLETED"),
      cancelled: sum((s) => s === "CANCELLED"),
    }
  })
}

/**
 * Orders grouped by category: one tile per service category with its counts.
 * Clicking a tile opens that category's order list (`base?category=<id>`).
 */
export function CategoryBoard({ items, base, locale, compact = false, current = "" }: { items: CategoryCount[]; base: string; locale: Locale; compact?: boolean; current?: string }) {
  if (compact) {
    return (
      <nav aria-label={pick(locale, "ক্যাটাগরি", "Categories")} className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Link href={base} className="chip shrink-0" data-on={!current}>{pick(locale, "সব ক্যাটাগরি", "All categories")}</Link>
        {items.map((c) => (
          <Link key={c.id} href={`${base}?category=${c.id}`} className="chip shrink-0" data-on={current === c.id}>
            {named(locale, c)} <span className="ml-1 rounded-full bg-ink/10 px-1.5 text-[10px]">{c.total}</span>
          </Link>
        ))}
      </nav>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {items.map((c) => (
        <Link key={c.id} href={`${base}?category=${c.id}`} className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:ring-brand/40">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white"><CategoryIcon name={c.icon} className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block leading-tight font-extrabold text-ink">{named(locale, c)}</span>
              <span className="block text-[11px] font-bold text-muted-foreground">{c.prefix}-xxxxx · {c.total} {pick(locale, "অর্ডার", "orders")}</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
          <dl className="grid grid-cols-4 gap-1 text-center text-[11px]">
            <div className="rounded-lg bg-amber-50 py-1.5"><dt className="text-amber-700">{pick(locale, "নতুন", "New")}</dt><dd className="text-base font-extrabold text-amber-800">{c.waiting}</dd></div>
            <div className="rounded-lg bg-teal-50 py-1.5"><dt className="text-teal-700">{pick(locale, "চলছে", "Running")}</dt><dd className="text-base font-extrabold text-teal-800">{c.running}</dd></div>
            <div className="rounded-lg bg-emerald-50 py-1.5"><dt className="text-emerald-700">{pick(locale, "শেষ", "Done")}</dt><dd className="text-base font-extrabold text-emerald-800">{c.completed}</dd></div>
            <div className="rounded-lg bg-rose-50 py-1.5"><dt className="text-rose-700">{pick(locale, "বাতিল", "Cancelled")}</dt><dd className="text-base font-extrabold text-rose-800">{c.cancelled}</dd></div>
          </dl>
        </Link>
      ))}
      {!items.length ? <p className="col-span-full text-sm text-muted-foreground">{pick(locale, "এই শপে এখনো কোনো সেবা ক্যাটাগরি নেই।", "This shop has no service categories yet.")}</p> : null}
    </div>
  )
}
