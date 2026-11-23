import { notFound } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { db } from "@/lib/db"
import { VEHICLE_STATUS_TEXT, rentalCategory, routesText, vehicleById, vehicleName } from "@/lib/vehicles"
import { pick } from "@/lib/i18n"
import { EmptyState, PageHeader } from "@/components/bits"
import { VehicleForm } from "@/components/admin/vehicle-form"

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, locale] = await Promise.all([params, requireUser(ADMINS, "/admin/vehicles"), getLocale()])
  const shop = await officeShop(user)
  const vehicle = await vehicleById(id)
  if (!vehicle || vehicle.shopId !== shop.id) notFound()
  const [category, workers] = await Promise.all([
    rentalCategory(shop.id),
    db.workerProfile.findMany({ where: { shopId: shop.id }, include: { user: true }, orderBy: [{ kind: "desc" }, { user: { name: "asc" } }] }),
  ])
  const status = VEHICLE_STATUS_TEXT[vehicle.status]
  const owner = vehicle.worker ? `${vehicle.worker.user.name} · ${vehicle.worker.user.phone ?? ""}` : pick(locale, "HANDYO-র নিজের", "HANDYO's own")
  return (
    <div>
      <PageHeader back="/admin/vehicles" title={vehicleName(vehicle, locale)} sub={`${status ? pick(locale, status.bn, status.en) : vehicle.status} · ${owner}`} />
      {category && category.offerings.length ? (
        <VehicleForm locale={locale} vehicle={{ ...vehicle, routes: routesText(vehicle.routes) }} offerings={category.offerings} workers={workers} />
      ) : (
        <EmptyState
          title={pick(locale, "ভাড়ার ক্যাটাগরি নেই", "No rental category yet")}
          body={pick(locale, "“সেবা ও দাম” পেজে RENTAL ধরনের ক্যাটাগরি চালু করুন, তারপর গাড়ি সম্পাদনা করা যাবে।", "Enable a RENTAL category on the Services & prices page, then this vehicle can be edited.")}
          href="/admin/services"
          action={pick(locale, "সেবা ও দাম", "Services & prices")}
        />
      )}
    </div>
  )
}
