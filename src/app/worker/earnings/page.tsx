import { requireUser, getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { workerShare } from "@/lib/bookings"
import { partnerShare } from "@/lib/vehicles"
import { getSettings } from "@/lib/settings"
import { dayStart, formatDay, localDate, localToday, shiftDays, taka } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { EmptyState, PageHeader, Section } from "@/components/bits"
import { partnerLedger } from "@/lib/partners"

export default async function EarningsPage() {
  const [user, locale] = await Promise.all([requireUser(["WORKER"], "/worker/earnings"), getLocale()])
  if (!user.shopId) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={pick(locale, "আমার আয়", "My earnings")} />
        <EmptyState title={pick(locale, "আপনার অ্যাকাউন্ট কোনো শপে যুক্ত নেই", "Your account is not attached to a shop")} body={pick(locale, "অফিসকে বলুন আপনাকে একটা শপে যুক্ত করতে।", "Ask the office to attach you to a shop.")} />
      </div>
    )
  }
  const settings = await getSettings(user.shopId)
  const partner = user.worker?.kind === "PARTNER"
  if (partner && user.worker) {
    const ledger = await partnerLedger({ id: user.worker.id, shopId: user.shopId })
    const today = localToday()
    const month = today.slice(0, 7)
    const week = shiftDays(today, -6)
    const mine = (from: string) => ledger.rows.filter((r) => r.day >= from).reduce((s, r) => s + r.partner, 0)
    const due = ledger.rows.filter((r) => !r.paid)
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={pick(locale, "হিসাব", "Ledger")} sub={pick(locale, `প্রতিটা অর্ডারের ${ledger.share}% আপনার, বাকিটা HANDYO-র · ${ledger.totals.count}টা অর্ডার শেষ`, `${ledger.share}% of each order is yours, the rest is HANDYO's · ${ledger.totals.count} orders completed`)} />
        <div className="grid grid-cols-3 gap-2">
          {[[pick(locale, "আজ", "Today"), mine(today)], [pick(locale, "৭ দিন", "7 days"), mine(week)], [pick(locale, "এই মাস", "This month"), mine(`${month}-01`)]].map(([label, value], i) => (
            <div key={label as string} className="kpi p-4" data-primary={i === 2}>
              <p className={`text-xs font-bold ${i === 2 ? "text-white/70" : "text-muted-foreground"}`}>{label as string}</p>
              <p className="text-xl font-extrabold">{taka(value as number, locale)}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-canvas p-2"><p className="text-muted-foreground">{pick(locale, "মোট বিল", "Gross")}</p><p className="font-extrabold text-ink">{taka(ledger.totals.gross, locale)}</p></div>
          <div className="rounded-xl bg-canvas p-2"><p className="text-muted-foreground">{pick(locale, "আপনার", "Yours")}</p><p className="font-extrabold text-ok">{taka(ledger.totals.partner, locale)}</p></div>
          <div className="rounded-xl bg-canvas p-2"><p className="text-muted-foreground">HANDYO</p><p className="font-extrabold text-ink">{taka(ledger.totals.handyo, locale)}</p></div>
        </div>
        {due.length ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{pick(locale, `${due.length}টা অর্ডারের পেমেন্ট এখনো লেখা হয়নি (${taka(due.reduce((n, r) => n + r.gross, 0), locale)})।`, `${due.length} orders still unpaid (${taka(due.reduce((n, r) => n + r.gross, 0), locale)}).`)}</p> : null}
        <Section title={pick(locale, "অর্ডার ধরে হিসাব", "By order")} className="mt-4">
          {!ledger.rows.length ? <p className="py-6 text-center text-sm text-muted-foreground">{pick(locale, "এখনো কোনো অর্ডার শেষ হয়নি।", "No completed orders yet.")}</p> : (
            <ul className="divide-y divide-line">
              {ledger.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{locale === "bn" ? r.titleBn : r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.code} · {formatDay(r.day, locale)} · {pick(locale, "বিল", "bill")} {taka(r.gross, locale)} · HANDYO {taka(r.handyo, locale)}{r.paid ? "" : ` · ${pick(locale, "পেমেন্ট বাকি", "unpaid")}`}</p>
                  </div>
                  <span className="shrink-0 font-extrabold text-ok">+{taka(r.partner, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    )
  }
  const share = partner ? Number(settings.partnerShare) || 85 : Number(settings.workerShare) || 40
  const cut = (price: number, visit: number) => (partner ? partnerShare(price, visit, share) : workerShare(price, visit, share))
  const jobs = user.worker
    ? await db.serviceBooking.findMany({
        where: { workerId: user.worker.id, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        include: { offering: true, area: true },
        take: 200,
      })
    : []
  const rows = jobs.map((j) => ({ ...j, pay: cut(j.finalPrice ?? j.estimatedPrice, j.visitCharge), day: localDate(j.completedAt!) }))
  const today = localToday()
  const week = shiftDays(today, -6)
  const month = `${today.slice(0, 7)}-01`
  const sum = (from: string) => rows.filter((r) => r.day >= from).reduce((s, r) => s + r.pay, 0)
  const since = dayStart(month)
  void since

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={pick(locale, "আমার আয়", "My earnings")} sub={partner ? pick(locale, `প্রতিটা ভাড়ার ${share}% আপনার`, `${share}% of each rental is yours`) : pick(locale, `প্রতিটা কাজের ${share}% আপনার, ভিজিট চার্জের অর্ধেকসহ`, `${share}% of each job is yours, plus half the visit charge`)} />
      <div className="grid grid-cols-3 gap-2">
        {[[pick(locale, "আজ", "Today"), sum(today)], [pick(locale, "৭ দিন", "7 days"), sum(week)], [pick(locale, "এই মাস", "This month"), sum(month)]].map(([label, value], i) => (
          <div key={label as string} className="kpi p-4" data-primary={i === 2}>
            <p className={`text-xs font-bold ${i === 2 ? "text-white/70" : "text-muted-foreground"}`}>{label as string}</p>
            <p className="text-xl font-extrabold">{taka(value as number, locale)}</p>
          </div>
        ))}
      </div>
      <Section title={pick(locale, "শেষ করা কাজ", "Completed jobs")} className="mt-4">
        {!rows.length ? <p className="py-6 text-center text-sm text-muted-foreground">{pick(locale, "এখনো কোনো কাজ শেষ হয়নি।", "No completed jobs yet.")}</p> : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{named(locale, r.offering)} · {named(locale, r.area)}</p>
                  <p className="text-xs text-muted-foreground">{r.code} · {formatDay(r.day, locale)} · {pick(locale, "বিল", "bill")} {taka(r.finalPrice ?? r.estimatedPrice, locale)}</p>
                </div>
                <span className="shrink-0 font-extrabold text-ok">+{taka(r.pay, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
