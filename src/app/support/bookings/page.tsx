import { requireUser, getLocale } from "@/lib/auth"
import { OFFICE } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { listBookings } from "@/lib/office"
import { pick } from "@/lib/i18n"
import { PageHeader } from "@/components/bits"
import { BookingTable } from "@/components/booking/table"
import { BookingFilters } from "@/components/booking/filters"
import { CategoryBoard, categoryCounts } from "@/components/booking/category-board"
import { db } from "@/lib/db"

export default async function SupportBookingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const [sp, user, locale] = await Promise.all([searchParams, requireUser(OFFICE, "/support/bookings"), getLocale()])
  const shop = await officeShop(user)
  const filtered = Object.values(sp).some(Boolean)
  const [rows, categories, areas, counts] = await Promise.all([
    filtered ? listBookings(shop.id, sp) : Promise.resolve([]),
    db.serviceCategory.findMany({ where: { shopId: shop.id }, orderBy: { sort: "asc" } }),
    db.serviceArea.findMany({ where: { shopId: shop.id }, orderBy: { sort: "asc" } }),
    categoryCounts(shop.id),
  ])
  return (
    <div>
      <PageHeader title={pick(locale, "বুকিং", "Bookings")} sub={filtered ? pick(locale, `${rows.length}টা`, `${rows.length} shown`) : pick(locale, "ক্যাটাগরি অনুযায়ী অর্ডার", "Orders by category")} />
      {!filtered ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{pick(locale, "ক্যাটাগরি বেছে নিন, তার অর্ডারগুলো দেখুন। নম্বর: ক্যাটাগরির প্রিফিক্স + এক ধারাবাহিক সিরিয়াল (যেমন CL-10001, CR-10002)।", "Pick a category to see its orders. Numbers: category prefix + one running serial (e.g. CL-10001, CR-10002).")}</p>
          <CategoryBoard items={counts} base="/support/bookings" locale={locale} />
          <div className="mt-4"><BookingFilters locale={locale} values={sp} categories={categories} areas={areas} base="/support/bookings" /></div>
        </>
      ) : (
        <>
          <CategoryBoard items={counts} base="/support/bookings" locale={locale} compact current={sp.category ?? ""} />
          <BookingFilters locale={locale} values={sp} categories={categories} areas={areas} base="/support/bookings" />
          <BookingTable rows={rows} locale={locale} base="/support/bookings" />
        </>
      )}
    </div>
  )
}
