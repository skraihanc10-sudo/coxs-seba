import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { db } from "@/lib/db"
import { listBookings } from "@/lib/office"
import { pick } from "@/lib/i18n"
import { PageHeader } from "@/components/bits"
import { BookingTable } from "@/components/booking/table"
import { BookingFilters } from "@/components/booking/filters"
import { CategoryBoard, categoryCounts } from "@/components/booking/category-board"

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const [sp, user, locale] = await Promise.all([searchParams, requireUser(ADMINS, "/admin/bookings"), getLocale()])
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
      <PageHeader title={pick(locale, "বুকিং", "Bookings")} sub={filtered ? pick(locale, `${shop.nameBn} · ${rows.length}টা দেখানো হচ্ছে`, `${shop.name} · ${rows.length} shown`) : pick(locale, `${shop.nameBn} · ক্যাটাগরি অনুযায়ী অর্ডার`, `${shop.name} · orders by category`)} />
      {!filtered ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{pick(locale, "ক্যাটাগরি বেছে নিন, তার অর্ডারগুলো দেখুন। নম্বর: ক্যাটাগরির প্রিফিক্স + এক ধারাবাহিক সিরিয়াল (যেমন CL-10001, CR-10002)।", "Pick a category to see its orders. Numbers: category prefix + one running serial (e.g. CL-10001, CR-10002).")}</p>
          <CategoryBoard items={counts} base="/admin/bookings" locale={locale} />
          <div className="mt-4"><BookingFilters locale={locale} values={sp} categories={categories} areas={areas} base="/admin/bookings" /></div>
        </>
      ) : (
        <>
          <CategoryBoard items={counts} base="/admin/bookings" locale={locale} compact current={sp.category ?? ""} />
          <BookingFilters locale={locale} values={sp} categories={categories} areas={areas} base="/admin/bookings" />
          <BookingTable rows={rows} locale={locale} base="/admin/bookings" />
        </>
      )}
    </div>
  )
}
