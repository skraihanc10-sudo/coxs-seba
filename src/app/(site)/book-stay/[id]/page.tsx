import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getLocale, getUser } from "@/lib/auth"
import { currentShop, shopById } from "@/lib/shops"
import { getSettings } from "@/lib/settings"
import { enabledProviders } from "@/lib/payments"
import { named, pick } from "@/lib/i18n"
import { homeFor } from "@/lib/roles"
import { pageMeta } from "@/lib/seo"
import { photosOf } from "@/lib/vehicles"
import { kindText, liveProperty, MAX_STAY_NIGHTS, propertyName, stayCategory } from "@/lib/stays"
import { PageHeader } from "@/components/bits"
import { StayWizard } from "@/components/stay-wizard"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"

type Params = Promise<{ id: string }>
type Search = Promise<{ room?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ id }, locale] = await Promise.all([params, getLocale()])
  const p = await liveProperty(id)
  if (!p) return { title: pick(locale, "রিসোর্ট পাওয়া যায়নি", "Property not found"), robots: { index: false, follow: false } }
  return pageMeta({ locale, title: pick(locale, `${propertyName(p, locale)} বুক করুন`, `Book ${propertyName(p, locale)}`), description: pick(locale, "তারিখ আর রুম বেছে বুক করুন।", "Pick your dates and room, then book."), path: `/book-stay/${p.id}`, noindex: true })
}

/** The stay booking wizard for one property; the property's own branch supplies payments. */
export default async function BookStayPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ id }, { room = "" }, locale, user, browsing] = await Promise.all([params, searchParams, getLocale(), getUser(), currentShop()])
  if (user && user.role !== "CUSTOMER") redirect(homeFor(user.role))
  const p = await liveProperty(id)
  if (!p) notFound()
  const shop = p.shopId === browsing.id ? browsing : ((await shopById(p.shopId)) ?? browsing)
  const [settings, category] = await Promise.all([getSettings(shop.id), stayCategory(shop.id)])
  if (!category) notFound()
  const bn = locale === "bn"
  const name = propertyName(p, locale)
  const rooms = p.rooms.filter((r) => r.active)
  return (
    <div className="mx-auto max-w-2xl">
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "রিসোর্ট ও হোটেল", "Resorts & hotels"), path: "/services/resort-booking" }, { name, path: `/stays/${p.id}` }, { name: pick(locale, "বুকিং", "Book"), path: `/book-stay/${p.id}` }])} />
      <PageHeader back={`/stays/${p.id}`} title={pick(locale, "রুম বুকিং", "Book a room")} sub={`${name} · ${kindText(p.kind, locale)} · ${named(locale, p.area)}`} />
      <StayWizard
        locale={locale}
        shop={{ city: shop.city, cityBn: shop.cityBn }}
        categoryId={category.id}
        property={{ id: p.id, name: p.name, nameBn: p.nameBn, kind: p.kind, area: named(locale, p.area), photo: photosOf(p)[0] ?? "", checkIn: p.checkIn, checkOut: p.checkOut, policy: bn ? p.policyBn || p.policy : p.policy || p.policyBn, owner: p.worker ? pick(locale, `পার্টনার: ${p.worker.user.name}`, `Partner: ${p.worker.user.name}`) : pick(locale, "HANDYO পরিচালিত", "HANDYO-managed") }}
        rooms={rooms.map((r) => ({ id: r.id, name: r.name, sleeps: r.sleeps, pricePerNight: r.pricePerNight, totalRooms: r.totalRooms, amenities: r.amenities }))}
        initialRoomId={room}
        payments={enabledProviders(settings).map((x) => ({ id: x.id, label: x.label, labelBn: x.labelBn, hint: x.hint, hintBn: x.hintBn }))}
        user={user ? { name: user.name, phone: user.phone ?? "" } : null}
        maxNights={MAX_STAY_NIGHTS}
      />
    </div>
  )
}
