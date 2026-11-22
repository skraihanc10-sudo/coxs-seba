import Link from "next/link"
import { Plus } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { ownerOverview, parsePeriod, periodRange, type Period } from "@/lib/reports"
import { taka } from "@/lib/format"
import { pick } from "@/lib/i18n"
import { officeShop } from "@/lib/shops"
import { setOfficeShopAction, toggleShopAction } from "@/actions/admin"
import { PageHeader } from "@/components/bits"

export default async function ShopsPage({ searchParams }: { searchParams: Promise<{ p?: string; from?: string; to?: string }> }) {
  const [{ p, from, to }, user, locale] = await Promise.all([searchParams, requireUser(["OWNER"], "/admin/shops"), getLocale()])
  const period: Period = parsePeriod(p ?? "month")
  const range = periodRange(period, from, to)
  const [{ rows, total }, current] = await Promise.all([ownerOverview(range), officeShop(user)])
  const { start, end } = range
  const periodLabel: Record<Period, string> = {
    today: pick(locale, "আজ", "Today"),
    week: pick(locale, "৭ দিন", "7 days"),
    month: pick(locale, "এই মাস", "This month"),
    year: pick(locale, "এই বছর", "This year"),
    custom: `${start} → ${end}`,
  }
  const bn = locale === "bn"
  const activeCount = rows.filter((r) => r.shop.active).length

  return (
    <div className="space-y-5">
      <PageHeader
        title={pick(locale, "সব শপ", "All shops")}
        sub={pick(locale, `${rows.length}টা শপ, ${activeCount}টা চালু · ${periodLabel[period]} · আয় শুধু শেষ হওয়া কাজের`, `${rows.length} shops, ${activeCount} active · ${periodLabel[period]} · revenue counts completed jobs only`)}
        action={<Link href="/admin/shops/new" className="btn-primary h-10 px-4 text-sm"><Plus className="size-4" /> {pick(locale, "নতুন শপ", "New shop")}</Link>}
      />

      <div className="flex flex-wrap items-center gap-2">
        {(["today", "week", "month", "year"] as Period[]).map((k) => (
          <Link key={k} href={`/admin/shops?p=${k}`} className="chip" data-on={period === k}>{periodLabel[k]}</Link>
        ))}
        <form className="flex items-center gap-1">
          <input type="hidden" name="p" value="custom" />
          <input type="date" name="from" defaultValue={period === "custom" ? start : ""} className="field h-9 w-36 text-xs" />
          <input type="date" name="to" defaultValue={period === "custom" ? end : ""} className="field h-9 w-36 text-xs" />
          <button className="chip" data-on={period === "custom"}>{pick(locale, "কাস্টম", "Custom")}</button>
        </form>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Kpi primary label={pick(locale, "মোট আয়", "Total revenue")} value={taka(total.revenue, locale)} />
        <Kpi label={pick(locale, "বুকিং", "Bookings")} value={String(total.booked)} />
        <Kpi label={pick(locale, "শেষ", "Completed")} value={String(total.completed)} />
        <Kpi label={pick(locale, "কর্মীর পাওনা", "Worker pay")} value={taka(total.workerPay, locale)} />
        <Kpi label={pick(locale, "মার্জিন", "Margin")} value={taka(total.margin, locale)} />
        <Kpi label={pick(locale, "এখন চলছে", "Running now")} value={String(total.running)} />
        <Kpi label={pick(locale, "কর্মী দরকার", "Needs a worker")} value={String(total.waiting)} />
        <Kpi label={pick(locale, "খোলা টিকেট", "Open tickets")} value={String(total.tickets)} />
      </div>

      {/* Cards on phones */}
      <div className="grid gap-3 md:hidden">
        {rows.map((r) => (
          <div key={r.shop.id} className={`card space-y-3 p-4 ${r.shop.active ? "" : "opacity-60"}`}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-ink">{bn ? r.shop.nameBn : r.shop.name}</p>
                <p className="text-xs text-muted-foreground">{bn ? r.shop.cityBn : r.shop.city} · /{r.shop.slug}</p>
              </div>
              <KindBadge kind={r.shop.kind} locale={locale} />
              <ActiveBadge active={r.shop.active} locale={locale} current={current.id === r.shop.id} />
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <Stat label={pick(locale, "আয়", "Revenue")} value={taka(r.revenue, locale)} strong />
              <Stat label={pick(locale, "বুকিং / শেষ", "Booked / done")} value={`${r.booked} / ${r.completed}`} />
              <Stat label={pick(locale, "মার্জিন", "Margin")} value={taka(r.margin, locale)} />
              <Stat label={pick(locale, "চলছে", "Running")} value={String(r.running)} />
              <Stat label={pick(locale, "অপেক্ষায়", "Waiting")} value={String(r.waiting)} />
              <Stat label={pick(locale, "টিকেট", "Tickets")} value={String(r.tickets)} />
              <Stat label={pick(locale, "কর্মী / এলাকা / সেবা", "Workers / areas / services")} value={`${r.shop._count.workers} / ${r.shop._count.areas} / ${r.shop._count.categories}`} />
              <Stat label={pick(locale, "ক্যাশ / মোবাইল", "Cash / mobile")} value={`${taka(r.cash, locale)} / ${taka(r.mobile, locale)}`} />
              <Stat label={pick(locale, "স্টাফ", "Staff")} value={r.shop.users.length ? r.shop.users.map((u) => u.name).join(", ") : "—"} />
            </dl>
            <Actions shopId={r.shop.id} active={r.shop.active} current={current.id === r.shop.id} locale={locale} />
          </div>
        ))}
      </div>

      {/* Table on desktop */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="table">
          <thead>
            <tr>
              <th>{pick(locale, "শপ", "Shop")}</th>
              <th>{pick(locale, "ধরন", "Kind")}</th>
              <th className="text-right">{pick(locale, "বুকিং", "Booked")}</th>
              <th className="text-right">{pick(locale, "শেষ", "Done")}</th>
              <th className="text-right">{pick(locale, "আয়", "Revenue")}</th>
              <th className="text-right">{pick(locale, "কর্মীর পাওনা", "Worker pay")}</th>
              <th className="text-right">{pick(locale, "মার্জিন", "Margin")}</th>
              <th className="text-right">{pick(locale, "ক্যাশ / মোবাইল", "Cash / mobile")}</th>
              <th className="text-right">{pick(locale, "চলছে", "Running")}</th>
              <th className="text-right">{pick(locale, "অপেক্ষায়", "Waiting")}</th>
              <th className="text-right">{pick(locale, "টিকেট", "Tickets")}</th>
              <th className="text-right">{pick(locale, "কর্মী / এলাকা / সেবা", "W / A / S")}</th>
              <th>{pick(locale, "স্টাফ", "Staff")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.shop.id} className={`${r.shop.active ? "" : "opacity-60"} hover:bg-canvas`}>
                <td>
                  <Link href={`/admin/shops/${r.shop.id}`} className="font-extrabold text-brand">{bn ? r.shop.nameBn : r.shop.name}</Link>
                  <p className="text-xs text-muted-foreground">{bn ? r.shop.cityBn : r.shop.city} · /{r.shop.slug}</p>
                </td>
                <td><div className="flex flex-col items-start gap-1"><KindBadge kind={r.shop.kind} locale={locale} /><ActiveBadge active={r.shop.active} locale={locale} current={current.id === r.shop.id} /></div></td>
                <td className="text-right">{r.booked}</td>
                <td className="text-right">{r.completed}</td>
                <td className="text-right font-extrabold">{taka(r.revenue, locale)}</td>
                <td className="text-right">{taka(r.workerPay, locale)}</td>
                <td className="text-right text-ok">{taka(r.margin, locale)}</td>
                <td className="text-right whitespace-nowrap">{taka(r.cash, locale)} / {taka(r.mobile, locale)}</td>
                <td className="text-right">{r.running}</td>
                <td className="text-right">{r.waiting ? <span className="font-bold text-amber-600">{r.waiting}</span> : 0}</td>
                <td className="text-right">{r.tickets}</td>
                <td className="text-right whitespace-nowrap">{r.shop._count.workers} / {r.shop._count.areas} / {r.shop._count.categories}</td>
                <td className="max-w-40 text-xs text-muted-foreground">{r.shop.users.length ? r.shop.users.map((u) => `${u.name}${u.role === "ADMIN" ? "" : " (S)"}`).join(", ") : "—"}</td>
                <td><Actions shopId={r.shop.id} active={r.shop.active} current={current.id === r.shop.id} locale={locale} compact /></td>
              </tr>
            ))}
            <tr className="bg-canvas font-extrabold">
              <td colSpan={2}>{pick(locale, "মোট", "Total")}</td>
              <td className="text-right">{total.booked}</td>
              <td className="text-right">{total.completed}</td>
              <td className="text-right">{taka(total.revenue, locale)}</td>
              <td className="text-right">{taka(total.workerPay, locale)}</td>
              <td className="text-right text-ok">{taka(total.margin, locale)}</td>
              <td className="text-right whitespace-nowrap">{taka(rows.reduce((s, r) => s + r.cash, 0), locale)} / {taka(rows.reduce((s, r) => s + r.mobile, 0), locale)}</td>
              <td className="text-right">{total.running}</td>
              <td className="text-right">{total.waiting}</td>
              <td className="text-right">{total.tickets}</td>
              <td className="text-right whitespace-nowrap">{rows.reduce((s, r) => s + r.shop._count.workers, 0)} / {rows.reduce((s, r) => s + r.shop._count.areas, 0)} / {rows.reduce((s, r) => s + r.shop._count.categories, 0)}</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>
      {!rows.length ? <p className="card p-6 text-center text-sm text-muted-foreground">{pick(locale, "এখনো কোনো শপ নেই।", "No shops yet.")}</p> : null}
    </div>
  )
}

function KindBadge({ kind, locale }: { kind: string; locale: "bn" | "en" }) {
  return kind === "PARTNER" ? <span className="pill bg-violet-50 text-violet-700">{pick(locale, "পার্টনার", "Partner")}</span> : <span className="pill bg-teal-50 text-teal-700">{pick(locale, "শাখা", "Branch")}</span>
}

function ActiveBadge({ active, locale, current }: { active: boolean; locale: "bn" | "en"; current: boolean }) {
  return (
    <span className="flex gap-1">
      <span className={`pill ${active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>{active ? pick(locale, "চালু", "On") : pick(locale, "বন্ধ", "Off")}</span>
      {current ? <span className="pill bg-brand-soft text-brand">{pick(locale, "এখন এখানে", "Current")}</span> : null}
    </span>
  )
}

function Actions({ shopId, active, current, locale, compact = false }: { shopId: string; active: boolean; current: boolean; locale: "bn" | "en"; compact?: boolean }) {
  const size = compact ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-xs"
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "justify-end" : ""}`}>
      <form action={setOfficeShopAction}>
        <input type="hidden" name="shopId" value={shopId} />
        <input type="hidden" name="back" value="/admin" />
        <button className={`btn-primary ${size}`} disabled={current}>{current ? pick(locale, "এখানেই আছেন", "Working here") : pick(locale, "এই শপে কাজ করুন", "Work in this shop")}</button>
      </form>
      <Link href={`/admin/shops/${shopId}`} className={`btn-soft ${size}`}>{pick(locale, "এডিট", "Edit")}</Link>
      <form action={toggleShopAction}>
        <input type="hidden" name="id" value={shopId} />
        <button className={`btn-ghost ${size}`}>{active ? pick(locale, "বন্ধ করুন", "Turn off") : pick(locale, "চালু করুন", "Turn on")}</button>
      </form>
    </div>
  )
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-extrabold text-ink" : "font-semibold text-ink"}>{value}</dd>
    </div>
  )
}

function Kpi({ label, value, primary = false }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className="kpi p-4" data-primary={primary}>
      <p className={`text-xs font-bold ${primary ? "text-white/70" : "text-muted-foreground"}`}>{label}</p>
      <p className="display text-xl font-extrabold">{value}</p>
    </div>
  )
}
