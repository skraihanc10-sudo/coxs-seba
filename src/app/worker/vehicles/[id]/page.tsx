import { notFound } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { pick } from "@/lib/i18n"
import { rentalCategory, routesText, vehicleName, VEHICLE_STATUS_TEXT } from "@/lib/vehicles"
import { partnerVehicleAction } from "@/actions/vehicles"
import { PageHeader } from "@/components/bits"
import { VehicleForm } from "@/components/partner/vehicle-form"

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale] = await Promise.all([params, getLocale()])
  const user = await requireUser(["WORKER"], `/worker/vehicles/${id}`)
  if (!user.worker) notFound()
  const vehicle = await db.vehicle.findFirst({ where: { id, workerId: user.worker.id }, include: { routes: { orderBy: { sort: "asc" } } } })
  if (!vehicle) notFound()
  const category = await rentalCategory(vehicle.shopId)
  const offerings = category?.offerings ?? []
  const status = VEHICLE_STATUS_TEXT[vehicle.status]
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back="/worker/vehicles" title={vehicleName(vehicle, locale)} sub={`${pick(locale, "অবস্থা:", "Status:")} ${status ? (locale === "bn" ? status.bn : status.en) : vehicle.status}`} />
      {vehicle.status === "REJECTED" && vehicle.rejectNote ? (
        <p className="mb-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-danger">{pick(locale, "বাতিলের কারণ:", "Rejected because:")} {vehicle.rejectNote} {pick(locale, "ঠিক করে সেভ করলে আবার অনুমোদনে যাবে।", "Fix it and save to resubmit for approval.")}</p>
      ) : null}
      <VehicleForm locale={locale} vehicle={{ ...vehicle, routes: routesText(vehicle.routes) }} offerings={offerings} action={partnerVehicleAction} />
    </div>
  )
}
