import Link from "next/link"
import { Plus } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { VEHICLE_STATUS_TEXT, photoUrl, photosOf, rentalCategory, shopVehicles, vehicleName } from "@/lib/vehicles"
import { taka, type Locale } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { reviewVehicleAction } from "@/actions/vehicles"
import { ActionForm, SubmitButton } from "@/components/forms"
import { EmptyState, PageHeader } from "@/components/bits"

type Vehicle = Awaited<ReturnType<typeof shopVehicles>>[number]

const TONE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-canvas text-muted-foreground",
  REJECTED: "bg-rose-100 text-rose-700",
}

export default async function VehiclesPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/vehicles"), getLocale()])
  const shop = await officeShop(user)
  const [vehicles, category] = await Promise.all([shopVehicles(shop.id), rentalCategory(shop.id)])
  const pending = vehicles.filter((v) => v.status === "PENDING")
  const live = vehicles.filter((v) => v.status === "APPROVED")
  const rest = vehicles.filter((v) => v.status === "PAUSED" || v.status === "REJECTED")
  return (
    <div className="space-y-6">
      <PageHeader
        title={pick(locale, "গাড়ি ও পার্টনার", "Vehicles & partners")}
        sub={pick(locale, `${shop.nameBn} · ${live.length}টি চালু · ${pending.length}টি অনুমোদনের অপেক্ষায়`, `${shop.name} · ${live.length} live · ${pending.length} waiting for approval`)}
        action={<Link href="/admin/vehicles/new" className="btn-primary h-10 px-4 text-sm"><Plus className="size-4" /> {pick(locale, "নতুন গাড়ি", "Add vehicle")}</Link>}
      />
      {!category ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pick(locale, "এই শপে এখনো ভাড়ার (RENTAL) ক্যাটাগরি নেই, তাই কাস্টমার গাড়ি বুক করতে পারবে না।", "This shop has no RENTAL category yet, so customers cannot book a vehicle.")}{" "}
          <Link href="/admin/services" className="font-bold underline">{pick(locale, "সেবা ও দাম পেজে যোগ করুন", "Add one on Services & prices")}</Link>
        </p>
      ) : null}
      {!vehicles.length ? (
        <EmptyState
          title={pick(locale, "এখনো কোনো গাড়ি নেই", "No vehicles yet")}
          body={pick(locale, "HANDYO-র নিজের গাড়ি যোগ করুন, বা পার্টনাররা সাইট থেকে আবেদন করলে এখানে দেখাবে।", "Add HANDYO's own vehicles, or wait for partners to apply from the public page.")}
          href="/admin/vehicles/new"
          action={pick(locale, "নতুন গাড়ি", "Add vehicle")}
        />
      ) : null}
      <Group title={pick(locale, "অনুমোদনের অপেক্ষায়", "Waiting for approval")} rows={pending} locale={locale} />
      <Group title={pick(locale, "চালু (সাইটে দেখাচ্ছে)", "Live on the site")} rows={live} locale={locale} />
      <Group title={pick(locale, "বন্ধ রাখা / বাতিল", "Paused / rejected")} rows={rest} locale={locale} />
    </div>
  )
}

function Group({ title, rows, locale }: { title: string; rows: Vehicle[]; locale: Locale }) {
  if (!rows.length) return null
  return (
    <section>
      <h2 className="display mb-3 text-lg font-extrabold text-ink">{title} <span className="text-sm font-bold text-muted-foreground">({rows.length})</span></h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((v) => <VehicleCard key={v.id} v={v} locale={locale} />)}
      </div>
    </section>
  )
}

function VehicleCard({ v, locale }: { v: Vehicle; locale: Locale }) {
  const cover = photosOf(v)[0]
  const status = VEHICLE_STATUS_TEXT[v.status]
  const rates = [
    v.pricePerHour ? `${taka(v.pricePerHour, locale)}/${pick(locale, "ঘণ্টা", "hr")}` : "",
    v.pricePerDay ? `${taka(v.pricePerDay, locale)}/${pick(locale, "দিন", "day")}` : "",
  ].filter(Boolean)
  return (
    <div className={`card overflow-hidden ${v.status === "REJECTED" || v.status === "PAUSED" ? "opacity-80" : ""}`}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl(cover)} alt={vehicleName(v, locale)} className="aspect-[16/9] w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid aspect-[16/9] w-full place-items-center bg-canvas text-sm text-muted-foreground">{pick(locale, "ছবি নেই", "No photo")}</div>
      )}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/admin/vehicles/${v.id}`} className="block truncate font-extrabold text-ink hover:text-brand">{vehicleName(v, locale)}</Link>
            <p className="text-xs text-muted-foreground">{named(locale, v.offering)}{v.plate ? ` · ${v.plate}` : ""} · {v.seats} {pick(locale, "সিট", "seats")}</p>
          </div>
          <span className={`pill shrink-0 ${TONE[v.status] ?? "bg-canvas"}`}>{status ? pick(locale, status.bn, status.en) : v.status}</span>
        </div>
        <p className="text-sm">
          {v.worker ? (
            <>
              <span className="font-bold text-ink">{pick(locale, "পার্টনার:", "Partner:")}</span> {v.worker.user.name}{v.worker.user.phone ? ` · ${v.worker.user.phone}` : ""}
              {!v.worker.approved ? <span className="pill ml-1 bg-amber-100 text-amber-800">{pick(locale, "নতুন পার্টনার", "new partner")}</span> : null}
            </>
          ) : (
            <span className="font-bold text-brand">{pick(locale, "HANDYO-র নিজের", "HANDYO's own")}</span>
          )}
        </p>
        <p className="text-sm font-semibold text-ink">{rates.length ? rates.join(" · ") : pick(locale, "ভাড়া দেওয়া নেই", "No rate set")}{v.minHours && v.pricePerHour ? <span className="text-xs font-normal text-muted-foreground"> · {pick(locale, `কমপক্ষে ${v.minHours} ঘণ্টা`, `min ${v.minHours} h`)}</span> : null}</p>
        <p className="text-xs text-muted-foreground">{v._count.bookings} {pick(locale, "বুকিং", "bookings")}</p>
        {v.rejectNote ? <p className="text-xs text-danger">{pick(locale, "বাতিলের কারণ:", "Reject reason:")} {v.rejectNote}</p> : null}

        {v.status === "PENDING" || v.status === "REJECTED" ? (
          <div className="space-y-2 pt-1">
            {v.status === "PENDING" ? (
              <ActionForm action={reviewVehicleAction} resetOnSuccess={false}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="decision" value="APPROVE" />
                <SubmitButton className="btn-primary h-10 w-full text-sm">{pick(locale, "অনুমোদন দিন", "Approve")}</SubmitButton>
              </ActionForm>
            ) : null}
            {v.status === "PENDING" ? (
              <ActionForm action={reviewVehicleAction} resetOnSuccess={false} className="flex gap-2">
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="decision" value="REJECT" />
                <input name="note" className="field h-10 flex-1 text-sm" placeholder={pick(locale, "বাতিলের কারণ", "Reject reason")} required minLength={3} maxLength={300} />
                <SubmitButton className="btn-danger h-10 shrink-0 px-3 text-sm">{pick(locale, "বাতিল", "Reject")}</SubmitButton>
              </ActionForm>
            ) : (
              <ActionForm action={reviewVehicleAction} resetOnSuccess={false}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="decision" value="APPROVE" />
                <SubmitButton className="btn-soft h-10 w-full text-sm">{pick(locale, "তবু অনুমোদন দিন", "Approve anyway")}</SubmitButton>
              </ActionForm>
            )}
          </div>
        ) : null}
        {v.status === "APPROVED" || v.status === "PAUSED" ? (
          <div className="flex items-center gap-2 pt-1">
            <ActionForm action={reviewVehicleAction} resetOnSuccess={false} className="flex-1">
              <input type="hidden" name="id" value={v.id} />
              <input type="hidden" name="decision" value={v.status === "APPROVED" ? "PAUSE" : "RESUME"} />
              <SubmitButton className="btn-soft h-10 w-full text-sm">{v.status === "APPROVED" ? pick(locale, "বন্ধ রাখুন", "Pause") : pick(locale, "আবার চালু", "Resume")}</SubmitButton>
            </ActionForm>
            <Link href={`/admin/vehicles/${v.id}`} className="btn-soft h-10 px-4 text-sm">{pick(locale, "সম্পাদনা", "Edit")}</Link>
          </div>
        ) : (
          <Link href={`/admin/vehicles/${v.id}`} className="block text-right text-xs font-bold text-brand">{pick(locale, "সম্পাদনা", "Edit")} →</Link>
        )}
      </div>
    </div>
  )
}
