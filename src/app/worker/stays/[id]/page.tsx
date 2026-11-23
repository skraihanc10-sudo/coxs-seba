import { notFound } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { activeAreas } from "@/lib/catalog"
import { pick } from "@/lib/i18n"
import { propertyName, roomsText, STAY_STATUS_TEXT } from "@/lib/stays"
import { partnerPropertyAction } from "@/actions/stays"
import { PageHeader } from "@/components/bits"
import { PropertyForm } from "@/components/partner/property-form"

export default async function EditStayPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale] = await Promise.all([params, getLocale()])
  const user = await requireUser(["WORKER"], `/worker/stays/${id}`)
  if (!user.worker) notFound()
  const property = await db.property.findFirst({ where: { id, workerId: user.worker.id }, include: { rooms: { orderBy: { sort: "asc" } } } })
  if (!property) notFound()
  const areas = await activeAreas(property.shopId)
  const status = STAY_STATUS_TEXT[property.status]
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back="/worker/stays" title={propertyName(property, locale)} sub={`${pick(locale, "অবস্থা:", "Status:")} ${status ? (locale === "bn" ? status.bn : status.en) : property.status}`} />
      {property.status === "REJECTED" && property.rejectNote ? (
        <p className="mb-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-danger">{pick(locale, "বাতিলের কারণ:", "Rejected because:")} {property.rejectNote} {pick(locale, "ঠিক করে সেভ করলে আবার অনুমোদনে যাবে।", "Fix it and save to resubmit for approval.")}</p>
      ) : null}
      <PropertyForm locale={locale} property={{ ...property, rooms: roomsText(property.rooms.filter((r) => r.active)) }} areas={areas} action={partnerPropertyAction} />
    </div>
  )
}
