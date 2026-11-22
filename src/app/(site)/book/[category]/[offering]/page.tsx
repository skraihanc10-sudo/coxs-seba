import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getLocale, getUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { activeAreas } from "@/lib/catalog"
import { currentShop } from "@/lib/shops"
import { getSettings } from "@/lib/settings"
import { enabledProviders } from "@/lib/payments"
import { BOOKING_DAYS, SLOTS } from "@/lib/bookings"
import { taka, upcomingDays } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { unitLabel } from "@/lib/pricing"
import { homeFor } from "@/lib/roles"
import { clip, pageMeta } from "@/lib/seo"
import { PageHeader } from "@/components/bits"
import { BookingWizard } from "@/components/booking-wizard"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"
import { photosOf, vehicleById } from "@/lib/vehicles"

type Params = Promise<{ category: string; offering: string }>
type Search = Promise<{ vehicle?: string }>

async function load(shopId: string, catSlug: string, offerSlug: string) {
  const category = await db.serviceCategory.findFirst({ where: { shopId, slug: catSlug, active: true } })
  const offering = category ? await db.serviceOffering.findFirst({ where: { categoryId: category.id, slug: offerSlug, active: true } }) : null
  return { category, offering }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ category: catSlug, offering: offerSlug }, locale, shop] = await Promise.all([params, getLocale(), currentShop()])
  const { category, offering } = await load(shop.id, catSlug, offerSlug)
  if (!category || !offering) return { title: pick(locale, "সেবা পাওয়া যায়নি", "Service not found"), robots: { index: false, follow: false } }
  const price = offering.pricing === "QUOTE" ? pick(locale, "দেখে দাম", "Quote after visit") : `${taka(offering.price, locale)}/${unitLabel(offering.pricing, locale)}`
  const city = locale === "bn" ? shop.cityBn : shop.city
  return pageMeta({
    locale,
    title: `${named(locale, offering)} · ${price}`,
    description: clip(`${locale === "bn" ? offering.detailBn : offering.detail} ${pick(locale, `${named(locale, category)}, ${city}। অনলাইনে বুক করুন, দাম আগেই জানুন।`, `${named(locale, category)} in ${city}. Book online and know the price up front.`)}`),
    path: `/book/${category.slug}/${offering.slug}`,
  })
}

export default async function BookPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ category: catSlug, offering: offerSlug }, { vehicle: vehicleId = "" }, locale, user, shop] = await Promise.all([params, searchParams, getLocale(), getUser(), currentShop()])
  if (user && user.role !== "CUSTOMER") redirect(homeFor(user.role))
  const [areas, settings, { category, offering }] = await Promise.all([activeAreas(shop.id), getSettings(shop.id), load(shop.id, catSlug, offerSlug)])
  if (!category || !offering) notFound()
  // Rentals: a vehicle picked on the category page. A stale or foreign id falls back to the plain offering.
  const picked = category.flow === "RENTAL" && vehicleId ? await vehicleById(vehicleId) : null
  const vehicle = picked && picked.shopId === shop.id && picked.offeringId === offering.id && picked.status === "APPROVED" ? picked : null
  const addresses = user ? await db.address.findMany({ where: { userId: user.id, area: { shopId: shop.id } }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }) : []

  return (
    <div className="mx-auto max-w-2xl">
      <JsonLd
        data={breadcrumbs([
          { name: "HANDYO", path: "/" },
          { name: pick(locale, "সব সেবা", "All services"), path: "/services" },
          { name: named(locale, category), path: `/services/${category.slug}` },
          { name: named(locale, offering), path: `/book/${category.slug}/${offering.slug}` },
        ])}
      />
      <PageHeader back={`/services/${category.slug}`} title={pick(locale, "বুকিং", "Book")} sub={`${named(locale, category)} · ${named(locale, offering)} · ${locale === "bn" ? shop.cityBn : shop.city}`} />
      <BookingWizard
        locale={locale}
        shop={{ slug: shop.slug, name: shop.name, nameBn: shop.nameBn, city: shop.city, cityBn: shop.cityBn }}
        category={{ slug: category.slug, name: category.name, nameBn: category.nameBn, flow: category.flow }}
        offering={{ id: offering.id, name: offering.name, nameBn: offering.nameBn, pricing: offering.pricing, price: offering.price, minQty: offering.minQty, detail: offering.detail, detailBn: offering.detailBn }}
        areas={areas.map((a) => ({ id: a.id, name: a.name, nameBn: a.nameBn, charge: a.charge }))}
        slots={SLOTS}
        days={upcomingDays(BOOKING_DAYS)}
        payments={enabledProviders(settings).map((p) => ({ id: p.id, label: p.label, labelBn: p.labelBn, hint: p.hint, hintBn: p.hintBn }))}
        user={user ? { name: user.name, phone: user.phone ?? "", addresses: addresses.map((a) => ({ id: a.id, label: a.label, areaId: a.areaId, line: a.line, landmark: a.landmark, phone: a.phone })) } : null}
        vehicle={vehicle ? { id: vehicle.id, title: vehicle.title, titleBn: vehicle.titleBn, seats: vehicle.seats, plate: vehicle.plate, photo: photosOf(vehicle)[0] ?? "", pricePerHour: vehicle.pricePerHour, pricePerDay: vehicle.pricePerDay, minHours: vehicle.minHours, owner: vehicle.worker ? pick(locale, `পার্টনার: ${vehicle.worker.user.name}`, `Partner: ${vehicle.worker.user.name}`) : pick(locale, "HANDYO-র নিজের গাড়ি", "HANDYO fleet") } : null}
      />
    </div>
  )
}
