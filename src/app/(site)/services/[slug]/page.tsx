import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Clock3 } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { categoryBySlug, fromPrice } from "@/lib/catalog"
import { currentShop } from "@/lib/shops"
import { named, pick, words } from "@/lib/i18n"
import { taka } from "@/lib/format"
import { PRICING_TEXT, unitLabel } from "@/lib/pricing"
import { marketVehicles, photosOf, specsOf, vehicleName } from "@/lib/vehicles"
import { VehicleMarket, type MarketVehicle } from "@/components/vehicle-market"
import { clip, pageMeta } from "@/lib/seo"
import { CategoryIcon } from "@/components/category-icon"
import { PageHeader } from "@/components/bits"
import { breadcrumbs, JsonLd, serviceLd } from "@/components/seo/json-ld"

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ slug }, locale, shop] = await Promise.all([params, getLocale(), currentShop()])
  const category = await categoryBySlug(shop.id, slug)
  if (!category) return { title: pick(locale, "সেবা পাওয়া যায়নি", "Service not found"), robots: { index: false, follow: false } }
  const from = fromPrice(category.offerings)
  const price = from ? pick(locale, ` · ${taka(from, locale)} থেকে`, ` · from ${taka(from, locale)}`) : ""
  const city = locale === "bn" ? shop.cityBn : shop.city
  return pageMeta({
    locale,
    title: `${named(locale, category)}${price} · ${city}`,
    description: clip(`${locale === "bn" ? category.blurbBn : category.blurb} ${pick(locale, `${city} এলাকায় ${category.offerings.length}টা অপশন, দাম আগেই লেখা।`, `${category.offerings.length} options in ${city}, prices listed up front.`)}`),
    path: `/services/${category.slug}`,
  })
}

export default async function CategoryPage({ params }: { params: Params }) {
  const [{ slug }, locale, shop] = await Promise.all([params, getLocale(), currentShop()])
  const category = await categoryBySlug(shop.id, slug)
  if (!category) notFound()
  const t = words(locale)
  const bn = locale === "bn"
  const rental = category.flow === "RENTAL"
  // Every branch's live vehicles in one marketplace; same-type vehicles of other
  // branches book through their own branch (the wizard follows the vehicle).
  const market: MarketVehicle[] = rental
    ? (await marketVehicles())
        .filter((v) => v.offering.category.slug === category.slug)
        .map((v) => {
          const cover = photosOf(v)[0]
          return {
            id: v.id,
            name: vehicleName(v, locale),
            typeId: category.offerings.find((o) => o.slug === v.offering.slug)?.id ?? v.offeringId,
            type: named(locale, v.offering),
            cover: cover ? `/api/uploads/${cover}` : null,
            seats: v.seats,
            detail: bn ? v.detailBn || v.detail : v.detail || v.detailBn,
            specs: specsOf(v),
            pricePerHour: v.pricePerHour,
            pricePerDay: v.pricePerDay,
            pricePerHalfDay: v.pricePerHalfDay,
            minHours: v.minHours,
            owner: v.worker?.kind === "PARTNER" ? v.worker.user.name : null,
            rating: v.worker && v.worker.ratingCount > 0 ? v.worker.rating : null,
            city: v.shopId === shop.id ? null : bn ? v.shop.cityBn : v.shop.city,
            href: `/book/${category.slug}/${v.offering.slug}?vehicle=${v.id}`,
          }
        })
    : []
  const minutes = (m: number) => (m >= 1440 ? pick(locale, `${Math.round(m / 1440)} দিন`, `${Math.round(m / 1440)} day${m >= 2880 ? "s" : ""}`) : m >= 60 ? pick(locale, `~${Math.round(m / 60)} ঘণ্টা`, `~${Math.round(m / 60)} hr`) : pick(locale, `${m} মিনিট`, `${m} min`))

  return (
    <div>
      <JsonLd
        data={[
          serviceLd(category, category.offerings, shop),
          breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "সব সেবা", "All services"), path: "/services" }, { name: named(locale, category), path: `/services/${category.slug}` }]),
        ]}
      />
      <PageHeader back="/services" title={named(locale, category)} sub={bn ? category.blurbBn : category.blurb} action={<span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand" aria-hidden><CategoryIcon name={category.icon} /></span>} />
      {category.flow === "LAUNDRY" ? (
        <p className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{pick(locale, "আমাদের রাইডার কাপড় নিয়ে যাবে, আমাদের লন্ড্রিতে পরিষ্কার হবে, রাইডারই ফেরত দেবে।", "Our rider collects, our laundry cleans, and the rider brings it back.")}</p>
      ) : null}
      {category.flow === "TEAM" ? (
        <p className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{pick(locale, "রুম সংখ্যা, টিমে কতজন আর কত দিন লাগবে বলুন। পুরো টিম পাঠানো হবে।", "Tell us the room count, team size and days. A full crew comes.")}</p>
      ) : null}
      {rental ? (
        <p className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{pick(locale, `পিকআপ পয়েন্ট (হোটেল বা বাসা) আর সময় দিন, গাড়ি বা বাইক সেখানেই পৌঁছে যাবে। ${shop.cityBn} এলাকার মধ্যে পিকআপ।`, `Give us a pickup point (hotel or home) and a time; the car or bike comes to you. Pickup inside ${shop.city}.`)}</p>
      ) : null}
      {rental ? (
        <section className="mb-6">
          <h2 className="display text-xl font-extrabold text-ink">{pick(locale, "বাইক, কার ও জিপ বেছে নিন", "Pick a bike, car or jeep")}</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">{pick(locale, "ছবি, স্পেক আর ভাড়া দেখে পছন্দেরটা বুক করুন; বুকিংয়ের পর অফিস গাড়ির মালিকের সাথে মিলিয়ে দেয়।", "See the photo, specs and rate, then book; the office connects you with the owner after booking.")}</p>
          {!market.length ? (
            <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted-foreground">{pick(locale, "এখন নির্দিষ্ট কোনো গাড়ি দেখানো নেই। নিচে ধরন বেছে বুক করুন, সেই ধরনের যেকোনো গাড়ি পাঠানো হবে।", "No specific vehicles are listed right now. Book by type below and any vehicle of that type will be sent.")}</p>
          ) : (
            <VehicleMarket
              locale={locale}
              fallback={category.image || null}
              types={category.offerings.map((o) => ({ id: o.id, name: named(locale, o) }))}
              vehicles={market}
            />
          )}
          <h2 className="display mt-8 text-xl font-extrabold text-ink">{pick(locale, "ধরন অনুযায়ী বুক করুন (যেকোনো গাড়ি)", "Book by type (any vehicle)")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{pick(locale, "নির্দিষ্ট গাড়ি দরকার না হলে ধরন বেছে নিন, আমরা গাড়ি ঠিক করে দেব।", "Don't need a specific vehicle? Pick a type and we'll assign one.")}</p>
        </section>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {category.offerings.map((o) => (
          <Link key={o.id} href={`/book/${category.slug}/${o.slug}`} className="card flex flex-col gap-2 p-4 transition hover:ring-brand/40 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-extrabold text-ink">{named(locale, o)}</h2>
              <span className="shrink-0 text-right">
                {o.pricing === "QUOTE" ? (
                  <span className="pill bg-brand-soft text-brand">{PRICING_TEXT.QUOTE[locale]}</span>
                ) : (
                  <span className="text-lg font-extrabold text-ink">{taka(o.price, locale)}<span className="text-xs font-semibold text-muted-foreground">/{unitLabel(o.pricing, locale)}</span></span>
                )}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{bn ? o.detailBn : o.detail}</p>
            <div className="mt-auto flex items-center justify-between pt-2 text-xs font-bold text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden /> {minutes(o.durationMin)}</span>
              {o.pricing === "QUOTE" && o.price > 0 ? <span>{pick(locale, `পরিদর্শন ফি ${taka(o.price, locale)}`, `Inspection ${taka(o.price, locale)}`)}</span> : null}
              <span className="text-brand">{t.bookNow} →</span>
            </div>
          </Link>
        ))}
      </div>
      {rental ? (
        <Link href="/partner" className="card mt-6 flex items-center justify-between gap-3 bg-brand-soft p-4 transition hover:ring-brand/40">
          <div>
            <p className="font-extrabold text-ink">{pick(locale, "আপনার গাড়ি বা বাইক ভাড়া দিতে চান?", "Want to rent out your car or bike?")}</p>
            <p className="text-sm text-muted-foreground">{pick(locale, "আপনি দাম ঠিক করেন, অর্ডার আর পেমেন্ট আমরা সামলাই।", "You set the price; we handle orders and payment.")}</p>
          </div>
          <span className="shrink-0 font-extrabold text-brand">{pick(locale, "পার্টনার হোন →", "Become a partner →")}</span>
        </Link>
      ) : null}
    </div>
  )
}
