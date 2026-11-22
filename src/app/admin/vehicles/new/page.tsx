import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { db } from "@/lib/db"
import { rentalCategory } from "@/lib/vehicles"
import { pick } from "@/lib/i18n"
import { EmptyState, PageHeader } from "@/components/bits"
import { VehicleForm } from "@/components/admin/vehicle-form"

export default async function NewVehiclePage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/vehicles/new"), getLocale()])
  const shop = await officeShop(user)
  const [category, workers] = await Promise.all([
    rentalCategory(shop.id),
    db.workerProfile.findMany({ where: { shopId: shop.id }, include: { user: true }, orderBy: [{ kind: "desc" }, { user: { name: "asc" } }] }),
  ])
  return (
    <div>
      <PageHeader back="/admin/vehicles" title={pick(locale, "নতুন গাড়ি", "New vehicle")} sub={pick(locale, `${shop.nameBn} শপে সাথে সাথে চালু হবে`, `Goes live in ${shop.name} at once`)} />
      {category && category.offerings.length ? (
        <VehicleForm locale={locale} vehicle={null} offerings={category.offerings} workers={workers} />
      ) : (
        <EmptyState
          title={pick(locale, "ভাড়ার ক্যাটাগরি নেই", "No rental category yet")}
          body={pick(locale, "প্রথমে “সেবা ও দাম” পেজে RENTAL ধরনের একটা ক্যাটাগরি ও তার গাড়ির ধরন (সেবা) যোগ করুন।", "First add a RENTAL category with its vehicle types (offerings) on the Services & prices page.")}
          href="/admin/services"
          action={pick(locale, "সেবা ও দাম", "Services & prices")}
        />
      )}
    </div>
  )
}
