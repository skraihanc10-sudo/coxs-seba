import Link from "next/link"
import { Plus } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { photoUrl, photosOf } from "@/lib/vehicles"
import { fromNight, kindText, propertyName, shopProperties, stayCategory, STAY_STATUS_TEXT } from "@/lib/stays"
import { taka, type Locale } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { reviewPropertyAction } from "@/actions/stays"
import { ActionForm, SubmitButton } from "@/components/forms"
import { EmptyState, PageHeader } from "@/components/bits"

type Property = Awaited<ReturnType<typeof shopProperties>>[number]

const TONE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-canvas text-muted-foreground",
  REJECTED: "bg-rose-100 text-rose-700",
}

export default async function StaysPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/stays"), getLocale()])
  const shop = await officeShop(user)
  const [list, category] = await Promise.all([shopProperties(shop.id), stayCategory(shop.id)])
  const pending = list.filter((p) => p.status === "PENDING")
  const live = list.filter((p) => p.status === "APPROVED")
  const rest = list.filter((p) => p.status === "PAUSED" || p.status === "REJECTED")
  return (
    <div className="space-y-6">
      <PageHeader
        title={pick(locale, "রিসোর্ট ও হোটেল", "Resorts & hotels")}
        sub={pick(locale, `${shop.nameBn} · ${live.length}টি চালু · ${pending.length}টি অনুমোদনের অপেক্ষায়`, `${shop.name} · ${live.length} live · ${pending.length} waiting for approval`)}
        action={<Link href="/admin/stays/new" className="btn-primary h-10 px-4 text-sm"><Plus className="size-4" /> {pick(locale, "নতুন রিসোর্ট", "Add property")}</Link>}
      />
      {!category ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pick(locale, "এই শপে এখনো রিসোর্ট (STAY) ক্যাটাগরি নেই, তাই কাস্টমার রুম বুক করতে পারবে না।", "This shop has no STAY category yet, so customers cannot book rooms.")}{" "}
          <Link href="/admin/services" className="font-bold underline">{pick(locale, "সেবা ও দাম পেজে যোগ করুন", "Add one on Services & prices")}</Link>
        </p>
      ) : null}
      {!list.length ? (
        <EmptyState title={pick(locale, "এখনো কোনো রিসোর্ট নেই", "No properties yet")} body={pick(locale, "HANDYO পরিচালিত রিসোর্ট যোগ করুন, বা মালিকরা সাইট থেকে আবেদন করলে এখানে দেখাবে।", "Add HANDYO-managed properties, or wait for owners to apply from the public page.")} href="/admin/stays/new" action={pick(locale, "নতুন রিসোর্ট", "Add property")} />
      ) : null}
      <Group title={pick(locale, "অনুমোদনের অপেক্ষায়", "Waiting for approval")} rows={pending} locale={locale} />
      <Group title={pick(locale, "চালু (সাইটে দেখাচ্ছে)", "Live on the site")} rows={live} locale={locale} />
      <Group title={pick(locale, "বন্ধ রাখা / বাতিল", "Paused / rejected")} rows={rest} locale={locale} />
    </div>
  )
}

function Group({ title, rows, locale }: { title: string; rows: Property[]; locale: Locale }) {
  if (!rows.length) return null
  return (
    <section>
      <h2 className="display mb-3 text-lg font-extrabold text-ink">{title} <span className="text-sm font-bold text-muted-foreground">({rows.length})</span></h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => <PropertyCard key={p.id} p={p} locale={locale} />)}
      </div>
    </section>
  )
}

function PropertyCard({ p, locale }: { p: Property; locale: Locale }) {
  const cover = photosOf(p)[0]
  const status = STAY_STATUS_TEXT[p.status]
  const from = fromNight(p)
  return (
    <div className={`card overflow-hidden ${p.status === "REJECTED" || p.status === "PAUSED" ? "opacity-80" : ""}`}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl(cover)} alt={propertyName(p, locale)} className="aspect-[16/9] w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid aspect-[16/9] w-full place-items-center bg-canvas text-sm text-muted-foreground">{pick(locale, "ছবি নেই", "No photo")}</div>
      )}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/admin/stays/${p.id}`} className="block truncate font-extrabold text-ink hover:text-brand">{propertyName(p, locale)}</Link>
            <p className="text-xs text-muted-foreground">{kindText(p.kind, locale)} · {named(locale, p.area)} · {pick(locale, `${p.rooms.length} ধরনের রুম`, `${p.rooms.length} room types`)}</p>
          </div>
          <span className={`pill shrink-0 ${TONE[p.status] ?? "bg-canvas"}`}>{status ? pick(locale, status.bn, status.en) : p.status}</span>
        </div>
        <p className="text-sm">
          {p.worker ? (
            <>
              <span className="font-bold text-ink">{pick(locale, "মালিক:", "Owner:")}</span> {p.worker.user.name}{p.worker.user.phone ? ` · ${p.worker.user.phone}` : ""}
              {!p.worker.approved ? <span className="pill ml-1 bg-amber-100 text-amber-800">{pick(locale, "নতুন পার্টনার", "new partner")}</span> : null}
            </>
          ) : (
            <span className="font-bold text-brand">{pick(locale, "HANDYO পরিচালিত", "HANDYO-managed")}</span>
          )}
        </p>
        <p className="text-sm font-semibold text-ink">{from ? `${taka(from, locale)}/${pick(locale, "রাত থেকে", "night from")}` : pick(locale, "দাম দেওয়া নেই", "No rate set")} <span className="text-xs font-normal text-muted-foreground">· {p._count.bookings} {pick(locale, "বুকিং", "bookings")}</span></p>
        {p.rejectNote ? <p className="text-xs text-danger">{pick(locale, "বাতিলের কারণ:", "Reject reason:")} {p.rejectNote}</p> : null}
        {p.status === "PENDING" || p.status === "REJECTED" ? (
          <div className="space-y-2 pt-1">
            {p.status === "PENDING" ? (
              <ActionForm action={reviewPropertyAction} resetOnSuccess={false}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="decision" value="APPROVE" />
                <SubmitButton className="btn-primary h-10 w-full text-sm">{pick(locale, "অনুমোদন দিন", "Approve")}</SubmitButton>
              </ActionForm>
            ) : null}
            {p.status === "PENDING" ? (
              <ActionForm action={reviewPropertyAction} resetOnSuccess={false} className="flex gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="decision" value="REJECT" />
                <input name="note" className="field h-10 flex-1 text-sm" placeholder={pick(locale, "বাতিলের কারণ", "Reject reason")} required minLength={3} maxLength={300} />
                <SubmitButton className="btn-danger h-10 shrink-0 px-3 text-sm">{pick(locale, "বাতিল", "Reject")}</SubmitButton>
              </ActionForm>
            ) : (
              <ActionForm action={reviewPropertyAction} resetOnSuccess={false}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="decision" value="APPROVE" />
                <SubmitButton className="btn-soft h-10 w-full text-sm">{pick(locale, "তবু অনুমোদন দিন", "Approve anyway")}</SubmitButton>
              </ActionForm>
            )}
          </div>
        ) : null}
        {p.status === "APPROVED" || p.status === "PAUSED" ? (
          <div className="flex items-center gap-2 pt-1">
            <ActionForm action={reviewPropertyAction} resetOnSuccess={false} className="flex-1">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="decision" value={p.status === "APPROVED" ? "PAUSE" : "RESUME"} />
              <SubmitButton className="btn-soft h-10 w-full text-sm">{p.status === "APPROVED" ? pick(locale, "বন্ধ রাখুন", "Pause") : pick(locale, "আবার চালু", "Resume")}</SubmitButton>
            </ActionForm>
            <Link href={`/admin/stays/${p.id}`} className="btn-soft h-10 px-4 text-sm">{pick(locale, "সম্পাদনা", "Edit")}</Link>
          </div>
        ) : (
          <Link href={`/admin/stays/${p.id}`} className="block text-right text-xs font-bold text-brand">{pick(locale, "সম্পাদনা", "Edit")} →</Link>
        )}
      </div>
    </div>
  )
}
