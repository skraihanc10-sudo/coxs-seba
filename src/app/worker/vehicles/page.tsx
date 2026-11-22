import Link from "next/link"
import { Pause, Pencil, Play, Plus } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { taka } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { photosOf, vehicleName, VEHICLE_STATUS_TEXT } from "@/lib/vehicles"
import { togglePartnerVehicleAction } from "@/actions/vehicles"
import { EmptyState, PageHeader } from "@/components/bits"
import { CategoryIcon } from "@/components/category-icon"

const TONE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-ok/10 text-emerald-800",
  PAUSED: "bg-canvas text-muted-foreground",
  REJECTED: "bg-[var(--danger-soft)] text-danger",
}

export default async function PartnerVehiclesPage() {
  const [user, locale] = await Promise.all([requireUser(["WORKER"], "/worker/vehicles"), getLocale()])
  const vehicles = user.worker
    ? await db.vehicle.findMany({ where: { workerId: user.worker.id }, include: { offering: { include: { category: { select: { icon: true } } } } }, orderBy: { createdAt: "desc" } })
    : []
  const bn = locale === "bn"
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={pick(locale, "আমার গাড়ি", "My vehicles")}
        sub={pick(locale, "অনুমোদিত গাড়ি সাইটে দেখায়; দরকারে বন্ধ রাখুন।", "Approved vehicles show on the site; pause one whenever you need.")}
        action={<Link href="/worker/vehicles/new" className="btn-primary h-10 shrink-0 px-3 text-sm"><Plus className="size-4" /> {pick(locale, "নতুন গাড়ি", "Add")}</Link>}
      />
      {!vehicles.length ? (
        <EmptyState title={pick(locale, "এখনো কোনো গাড়ি নেই", "No vehicles yet")} body={pick(locale, "আপনার গাড়ি বা বাইক যোগ করুন, অ্যাডমিন অনুমোদন দিলে সাইটে দেখাবে।", "Add your car or bike; it shows on the site once the admin approves it.")} href="/worker/vehicles/new" action={pick(locale, "নতুন গাড়ি যোগ করুন", "Add a vehicle")} />
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => {
            const cover = photosOf(v)[0]
            const status = VEHICLE_STATUS_TEXT[v.status]
            const live = v.status === "APPROVED" || v.status === "PAUSED"
            return (
              <article key={v.id} className="card flex gap-3 p-3">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/uploads/${cover}`} alt={vehicleName(v, locale)} className="size-24 shrink-0 rounded-xl object-cover ring-1 ring-line" />
                ) : (
                  <span className="grid size-24 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden><CategoryIcon name={v.offering.category.icon} className="size-8" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-ink">{vehicleName(v, locale)}</p>
                      <p className="text-xs text-muted-foreground">{named(locale, v.offering)} · {pick(locale, `${v.seats} সিট`, `${v.seats} seats`)}{v.plate ? ` · ${v.plate}` : ""}</p>
                    </div>
                    <span className={`pill shrink-0 ${TONE[v.status] ?? "bg-canvas"}`}>{status ? (bn ? status.bn : status.en) : v.status}</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {v.pricePerHour ? `${taka(v.pricePerHour, locale)}/${pick(locale, "ঘণ্টা", "hr")}` : ""}
                    {v.pricePerHour && v.pricePerDay ? " · " : ""}
                    {v.pricePerDay ? `${taka(v.pricePerDay, locale)}/${pick(locale, "দিন", "day")}` : ""}
                  </p>
                  {v.status === "REJECTED" && v.rejectNote ? <p className="mt-1 text-xs text-danger">{pick(locale, "কারণ:", "Reason:")} {v.rejectNote} {pick(locale, "— ঠিক করে সেভ করলে আবার পাঠানো হবে।", "— fix and save to resubmit.")}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href={`/worker/vehicles/${v.id}`} className="btn-soft h-9 px-3 text-sm"><Pencil className="size-3.5" /> {pick(locale, "এডিট", "Edit")}</Link>
                    {live ? (
                      <form action={togglePartnerVehicleAction}>
                        <input type="hidden" name="id" value={v.id} />
                        <button type="submit" className="btn-ghost h-9 px-3 text-sm">
                          {v.status === "APPROVED" ? <><Pause className="size-3.5" /> {pick(locale, "বন্ধ রাখুন", "Pause")}</> : <><Play className="size-3.5" /> {pick(locale, "আবার চালু", "Resume")}</>}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
