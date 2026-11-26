import Link from "next/link"
import { Building2, Car, ChevronRight, ClipboardCheck, MapPin, Phone, Store, Users, Wallet } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { flowFor, workerButton, workerNext } from "@/lib/booking-flow"
import { formatDay, localToday, taka, telHref } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { vehicleName } from "@/lib/vehicles"
import { partnerBookingsWhere, partnerLedger } from "@/lib/partners"
import { CategoryIcon } from "@/components/category-icon"
import { EmptyState, PageHeader, StatusPill } from "@/components/bits"

/**
 * The worker's home. Our own staff see today's jobs; a partner (store, vehicle
 * or resort owner, or their helper) gets the same dashboard for every kind of
 * business: numbers up top, every order on their listings, and shortcuts to
 * what they sell.
 */
export default async function WorkerHome() {
  const [user, locale] = await Promise.all([requireUser(["WORKER"], "/worker"), getLocale()])
  const today = localToday()
  const partner = user.worker?.kind === "PARTNER"
  const where = user.worker ? (partner ? partnerBookingsWhere(user.worker.id) : { workerId: user.worker.id }) : null
  const jobs = where
    ? await db.serviceBooking.findMany({
        where: { ...where, status: { notIn: ["COMPLETED", "CANCELLED"] } },
        orderBy: [{ visitDate: "asc" }, { createdAt: "desc" }],
        include: { category: true, offering: true, area: true, vehicle: { select: { title: true, titleBn: true } }, store: { select: { name: true, nameBn: true } }, requests: { where: { status: "PENDING" }, select: { kind: true } } },
      })
    : []
  const todays = jobs.filter((j) => j.visitDate <= today)
  const later = jobs.filter((j) => j.visitDate > today)
  const waiting = jobs.filter((j) => j.status === "REQUESTED").length

  const [listings, ledger] = partner && user.worker
    ? await Promise.all([
        Promise.all([
          db.store.count({ where: { workerId: user.worker.id } }),
          db.vehicle.count({ where: { workerId: user.worker.id } }),
          db.property.count({ where: { workerId: user.worker.id } }),
          db.product.count({ where: { store: { workerId: user.worker.id }, active: true } }),
          db.workerSkill.findMany({ where: { workerId: user.worker.id }, select: { category: { select: { flow: true, slug: true } } } }),
          db.ticketStock.count({ where: { workerId: user.worker.id, status: { in: ["APPROVED", "PAUSED", "PENDING"] } } }),
        ]),
        partnerLedger(user.worker, 400),
      ])
    : [[0, 0, 0, 0, [], 0], null]
  const [stores, vehicles, properties, products, skills, tickets] = listings
  const skillRows = skills as Array<{ category: { flow: string; slug: string } }>
  const flows = new Set(skillRows.map((s) => s.category.flow))
  const agent = skillRows.some((s) => s.category.slug === "saint-martin-ship")
  const firstHref = agent ? "/worker/tickets" : flows.has("RENTAL") ? "/worker/vehicles/new" : flows.has("STAY") ? "/worker/stays/new" : "/worker/store"
  const firstLabel = agent ? pick(locale, "টিকিট স্টক দিন", "Add ticket stock") : flows.has("RENTAL") ? pick(locale, "প্রথম গাড়ি যোগ করুন", "Add your first vehicle") : flows.has("STAY") ? pick(locale, "রিসোর্ট যোগ করুন", "Add your resort") : pick(locale, "দোকান খুলে পণ্য যোগ করুন", "Open your store and add items")
  const month = today.slice(0, 7)
  const monthTotal = ledger ? ledger.rows.filter((r) => r.day.startsWith(month)).reduce((n, r) => n + r.partner, 0) : 0

  const Job = ({ j }: { j: (typeof jobs)[number] }) => {
    const next = workerNext(flowFor(j.category.flow), j.status)
    return (
      <div className="card relative p-4 transition hover:ring-brand/40">
        <Link href={`/worker/jobs/${j.code}`} className="absolute inset-0 rounded-[inherit]" aria-label={`${j.code} ${named(locale, j.offering)}`} />
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><CategoryIcon name={j.category.icon} className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold text-ink">{named(locale, j.offering)}{j.store ? <span className="font-semibold text-muted-foreground"> · {named(locale, j.store)}</span> : null}</p>
            <p className="text-xs text-muted-foreground">{j.code} · {formatDay(j.visitDate, locale)} · <span className="font-bold text-ink">{j.visitSlot}</span> · {taka(j.finalPrice ?? j.estimatedPrice + j.extraCharge, locale)}</p>
            {j.vehicle ? <p className="truncate text-xs text-muted-foreground">{pick(locale, "গাড়ি:", "Vehicle:")} <span className="font-bold text-ink">{vehicleName(j.vehicle, locale)}</span></p> : null}
          </div>
          <StatusPill status={j.status} locale={locale} flow={j.category.flow} />
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground"><MapPin className="size-3.5 shrink-0 text-brand" /><span className="truncate">{named(locale, j.area)} · {j.addressLine}</span></span>
          <a href={telHref(j.phone)} className="relative z-10 inline-flex shrink-0 items-center gap-1 font-bold text-brand"><Phone className="size-3.5" /> {j.contactName || pick(locale, "কল", "Call")}</a>
        </div>
        {j.requests.length ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-800">{pick(locale, "অফিসের অনুমোদনের অপেক্ষায়:", "Waiting for office approval:")} {j.requests.map((r) => (r.kind === "EXTRA" ? pick(locale, "এক্সট্রা চার্জ", "extra charge") : pick(locale, "বাতিল", "cancel"))).join(", ")}</p> : null}
        {next ? (
          <p className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-center text-sm font-extrabold text-brand">{pick(locale, "পরের ধাপ:", "Next:")} {workerButton(flowFor(j.category.flow), next, locale)}</p>
        ) : j.status === "REQUESTED" ? (
          <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-center text-xs font-bold text-muted-foreground">{pick(locale, "HANDYO অফিস কনফার্ম করলে কাজ শুরু করা যাবে।", "Starts once the HANDYO office confirms.")}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={pick(locale, `আসসালামু আলাইকুম, ${user.name.split(" ")[0]}`, `Hello, ${user.name.split(" ")[0]}`)}
        sub={user.isHelper ? pick(locale, `${user.helperBoss}-এর হেল্পার হিসেবে কাজ করছেন`, `Working as ${user.helperBoss}'s helper`) : partner ? pick(locale, `${jobs.length}টা চলমান অর্ডার${waiting ? ` · ${waiting}টা অফিসের কনফার্মের অপেক্ষায়` : ""}`, `${jobs.length} open orders${waiting ? ` · ${waiting} awaiting office confirmation` : ""}`) : pick(locale, `আজ ${todays.length}টা জব`, `${todays.length} job${todays.length === 1 ? "" : "s"} today`)}
      />

      {partner ? (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="kpi p-4"><p className="text-xs font-bold text-muted-foreground">{pick(locale, "চলমান অর্ডার", "Open orders")}</p><p className="text-xl font-extrabold">{jobs.length}</p></div>
            <div className="kpi p-4"><p className="text-xs font-bold text-muted-foreground">{pick(locale, "শেষ হয়েছে", "Completed")}</p><p className="text-xl font-extrabold">{ledger?.totals.count ?? 0}</p></div>
            <div className="kpi p-4" data-primary><p className="text-xs font-bold text-white/70">{pick(locale, "এই মাসে আপনার", "Yours this month")}</p><p className="text-xl font-extrabold">{taka(monthTotal, locale)}</p></div>
          </div>
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stores ? <Link href="/worker/store" className="card flex items-center gap-2 p-3 text-sm font-bold text-ink hover:ring-brand/40"><Store className="size-4 text-brand" /> {pick(locale, `দোকান · ${products} পণ্য`, `Store · ${products} items`)}</Link> : null}
            {vehicles ? <Link href="/worker/vehicles" className="card flex items-center gap-2 p-3 text-sm font-bold text-ink hover:ring-brand/40"><Car className="size-4 text-brand" /> {pick(locale, `${vehicles}টা গাড়ি`, `${vehicles} vehicles`)}</Link> : null}
            {tickets ? <Link href="/worker/tickets" className="card flex items-center gap-2 p-3 text-sm font-bold text-ink hover:ring-brand/40"><ClipboardCheck className="size-4 text-brand" /> {pick(locale, `${tickets} ধরনের টিকিট`, `${tickets} ticket types`)}</Link> : null}
            {properties ? <Link href="/worker/stays" className="card flex items-center gap-2 p-3 text-sm font-bold text-ink hover:ring-brand/40"><Building2 className="size-4 text-brand" /> {pick(locale, `${properties}টা রিসোর্ট`, `${properties} resorts`)}</Link> : null}
            {!stores && !vehicles && !properties && !tickets ? <Link href={firstHref} className="card flex items-center gap-2 bg-brand-soft p-3 text-sm font-bold text-brand ring-brand/30 hover:ring-brand/60"><Store className="size-4" /> {firstLabel}</Link> : null}
            <Link href="/worker/earnings" className="card flex items-center gap-2 p-3 text-sm font-bold text-ink hover:ring-brand/40"><Wallet className="size-4 text-brand" /> {pick(locale, "হিসাব", "Ledger")}</Link>
            {!user.isHelper ? <Link href="/worker/helpers" className="card flex items-center gap-2 p-3 text-sm font-bold text-ink hover:ring-brand/40"><Users className="size-4 text-brand" /> {pick(locale, "হেল্পার", "Helpers")}</Link> : null}
          </div>
          <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><ClipboardCheck className="size-3.5" /> {pick(locale, "বাতিল বা এক্সট্রা চার্জ লাগলে অর্ডার খুলে অনুরোধ পাঠান; HANDYO অফিস অনুমোদন দিলে কার্যকর হবে।", "Need to cancel or add an extra charge? Open the order and send a request; it takes effect once the HANDYO office approves.")}</p>
        </>
      ) : null}

      {!jobs.length ? (
        <EmptyState title={partner ? pick(locale, "এখন কোনো অর্ডার নেই", "No orders right now") : pick(locale, "এখন কোনো জব নেই", "No jobs right now")} body={pick(locale, "নতুন অর্ডার এলে এখানে দেখাবে আর নোটিশ পাবেন।", "New orders show here and you'll get an alert.")} />
      ) : (
        <div className="space-y-6">
          {todays.length ? <section className="space-y-2"><h2 className="text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "আজ ও আগের", "Today & earlier")}</h2>{todays.map((j) => <Job key={j.id} j={j} />)}</section> : null}
          {later.length ? <section className="space-y-2"><h2 className="text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "পরে", "Upcoming")}</h2>{later.map((j) => <Job key={j.id} j={j} />)}</section> : null}
        </div>
      )}
    </div>
  )
}
