import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { isOpen } from "@/lib/booking-flow"
import { formatDay, taka } from "@/lib/format"
import { named, pick, words } from "@/lib/i18n"
import { billFor } from "@/lib/pricing"
import { privateMeta } from "@/lib/seo"
import { CategoryIcon } from "@/components/category-icon"
import { EmptyState, PageHeader, StatusPill } from "@/components/bits"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return privateMeta(words(locale).bookings)
}

export default async function BookingsPage() {
  const [user, locale] = await Promise.all([requireUser(["CUSTOMER"], "/bookings"), getLocale()])
  const t = words(locale)
  // A customer's bookings across every branch they have used; each row names its shop.
  const bookings = await db.serviceBooking.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { category: true, offering: true, area: true, shop: { select: { id: true, name: true, nameBn: true, cityBn: true, city: true } }, worker: { include: { user: { select: { name: true } } } } },
  })
  const open = bookings.filter((b) => isOpen(b.status))
  const past = bookings.filter((b) => !isOpen(b.status))
  const manyShops = new Set(bookings.map((b) => b.shop.id)).size > 1

  const Item = ({ b }: { b: (typeof bookings)[number] }) => (
    <Link href={`/bookings/${b.code}`} className="card flex items-center gap-3 p-4 transition hover:ring-brand/40">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden><CategoryIcon name={b.category.icon} className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-extrabold text-ink">{named(locale, b.offering)}</span>
          <StatusPill status={b.status} locale={locale} flow={b.category.flow} />
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {b.code} · {formatDay(b.visitDate, locale)} {b.visitSlot} · {named(locale, b.area)}{manyShops ? ` · ${locale === "bn" ? b.shop.cityBn : b.shop.city}` : ""}{b.worker ? ` · ${b.worker.user.name}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-right text-sm font-extrabold text-ink">{taka(b.finalPrice ?? billFor(b), locale)}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  )

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.bookings} />
      {!bookings.length ? (
        <EmptyState title={pick(locale, "এখনো কোনো বুকিং নেই", "No bookings yet")} body={pick(locale, "প্রথম সেবাটা বুক করুন, কয়েক মিনিটেই হয়ে যাবে।", "Book your first service; it takes a minute.")} href="/services" action={t.services} />
      ) : (
        <div className="space-y-6">
          {open.length ? (
            <section>
              <h2 className="mb-2 text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "চলমান", "Active")}</h2>
              <div className="space-y-2">{open.map((b) => <Item key={b.id} b={b} />)}</div>
            </section>
          ) : null}
          {past.length ? (
            <section>
              <h2 className="mb-2 text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "আগের", "Past")}</h2>
              <div className="space-y-2">{past.map((b) => <Item key={b.id} b={b} />)}</div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
