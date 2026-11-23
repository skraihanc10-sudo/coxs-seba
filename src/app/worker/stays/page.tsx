import Link from "next/link"
import { Pause, Pencil, Play, Plus } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { taka } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { photoUrl, photosOf } from "@/lib/vehicles"
import { fromNight, kindText, propertyName, STAY_STATUS_TEXT } from "@/lib/stays"
import { togglePartnerPropertyAction } from "@/actions/stays"
import { EmptyState, PageHeader } from "@/components/bits"

const TONE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-ok/10 text-emerald-800",
  PAUSED: "bg-canvas text-muted-foreground",
  REJECTED: "bg-[var(--danger-soft)] text-danger",
}

export default async function PartnerStaysPage() {
  const [user, locale] = await Promise.all([requireUser(["WORKER"], "/worker/stays"), getLocale()])
  const list = user.worker ? await db.property.findMany({ where: { workerId: user.worker.id }, include: { area: true, rooms: true }, orderBy: { createdAt: "desc" } }) : []
  const bn = locale === "bn"
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={pick(locale, "আমার রিসোর্ট", "My resorts")}
        sub={pick(locale, "অনুমোদিত রিসোর্ট সাইটে দেখায়; দরকারে বন্ধ রাখুন।", "Approved properties show on the site; pause one whenever you need.")}
        action={<Link href="/worker/stays/new" className="btn-primary h-10 shrink-0 px-3 text-sm"><Plus className="size-4" /> {pick(locale, "নতুন", "Add")}</Link>}
      />
      {!list.length ? (
        <EmptyState title={pick(locale, "এখনো কোনো রিসোর্ট নেই", "No properties yet")} body={pick(locale, "আপনার রিসোর্ট, হোটেল বা কটেজ যোগ করুন; অ্যাডমিন অনুমোদন দিলে সাইটে দেখাবে।", "Add your resort, hotel or cottage; it shows on the site once approved.")} href="/worker/stays/new" action={pick(locale, "রিসোর্ট যোগ করুন", "Add a property")} />
      ) : (
        <div className="space-y-3">
          {list.map((p) => {
            const cover = photosOf(p)[0]
            const status = STAY_STATUS_TEXT[p.status]
            const live = p.status === "APPROVED" || p.status === "PAUSED"
            const from = fromNight(p)
            return (
              <article key={p.id} className="card flex gap-3 p-3">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl(cover)} alt={propertyName(p, locale)} className="size-24 shrink-0 rounded-xl object-cover ring-1 ring-line" />
                ) : <span className="size-24 shrink-0 rounded-xl bg-brand-soft" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-ink">{propertyName(p, locale)}</p>
                      <p className="text-xs text-muted-foreground">{kindText(p.kind, locale)} · {named(locale, p.area)} · {pick(locale, `${p.rooms.length} ধরনের রুম`, `${p.rooms.length} room types`)}</p>
                    </div>
                    <span className={`pill shrink-0 ${TONE[p.status] ?? "bg-canvas"}`}>{status ? (bn ? status.bn : status.en) : p.status}</span>
                  </div>
                  {from ? <p className="mt-1 text-sm font-bold text-ink">{taka(from, locale)}/{pick(locale, "রাত থেকে", "night from")}</p> : null}
                  {p.status === "REJECTED" && p.rejectNote ? <p className="mt-1 text-xs text-danger">{pick(locale, "কারণ:", "Reason:")} {p.rejectNote} {pick(locale, "— ঠিক করে সেভ করলে আবার পাঠানো হবে।", "— fix and save to resubmit.")}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href={`/worker/stays/${p.id}`} className="btn-soft h-9 px-3 text-sm"><Pencil className="size-3.5" /> {pick(locale, "এডিট", "Edit")}</Link>
                    {live ? (
                      <form action={togglePartnerPropertyAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="btn-ghost h-9 px-3 text-sm">
                          {p.status === "APPROVED" ? <><Pause className="size-3.5" /> {pick(locale, "বন্ধ রাখুন", "Pause")}</> : <><Play className="size-3.5" /> {pick(locale, "আবার চালু", "Resume")}</>}
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
