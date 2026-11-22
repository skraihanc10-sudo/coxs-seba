import { requireUser, getLocale } from "@/lib/auth"
import { pick } from "@/lib/i18n"
import { rentalCategory } from "@/lib/vehicles"
import { partnerVehicleAction } from "@/actions/vehicles"
import { EmptyState, PageHeader } from "@/components/bits"
import { VehicleForm } from "@/components/partner/vehicle-form"

export default async function NewVehiclePage() {
  const [user, locale] = await Promise.all([requireUser(["WORKER"], "/worker/vehicles/new"), getLocale()])
  const category = user.shopId ? await rentalCategory(user.shopId) : null
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back="/worker/vehicles" title={pick(locale, "নতুন গাড়ি যোগ করুন", "Add a vehicle")} sub={pick(locale, "অ্যাডমিনের অনুমোদনের পর সাইটে দেখাবে।", "Shows on the site once the admin approves it.")} />
      {!category?.offerings.length ? (
        <EmptyState title={pick(locale, "এই শপে ভাড়ার সেবা চালু নেই", "This shop has no rental service")} body={pick(locale, "অফিসকে বলুন ভাড়ার ক্যাটাগরি চালু করতে।", "Ask the office to enable the rental category.")} />
      ) : (
        <VehicleForm locale={locale} vehicle={null} offerings={category.offerings} action={partnerVehicleAction} />
      )}
    </div>
  )
}
