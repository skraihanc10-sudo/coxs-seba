import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Clock3, MapPin, Star, Users } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { currentShop } from "@/lib/shops"
import { named, pick } from "@/lib/i18n"
import { taka } from "@/lib/format"
import { photosOf, photoUrl, specsOf, vehicleById, vehicleName } from "@/lib/vehicles"
import { clip, pageMeta } from "@/lib/seo"
import { PageHeader, TrustStrip } from "@/components/bits"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"

type Params = Promise<{ id: string }>

async function liveVehicle(id: string) {
  const v = await vehicleById(id)
  if (!v || v.status !== "APPROVED" || v.offering.category.flow !== "RENTAL") return null
  if (v.worker && (!v.worker.approved || !v.worker.user.active)) return null
  return v
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ id }, locale] = await Promise.all([params, getLocale()])
  const v = await liveVehicle(id)
  if (!v) return { title: pick(locale, "গাড়ি পাওয়া যায়নি", "Vehicle not found"), robots: { index: false, follow: false } }
  const city = locale === "bn" ? v.shop.cityBn : v.shop.city
  return pageMeta({
    locale,
    title: `${vehicleName(v, locale)} · ${named(locale, v.offering)} · ${city}`,
    description: clip(`${locale === "bn" ? v.detailBn || v.detail : v.detail || v.detailBn} ${pick(locale, `${v.seats} সিট। ${city} এলাকায় ভাড়া, অনলাইনে বুক করুন।`, `${v.seats} seats. Rent in ${city}, book online.`)}`),
    path: `/vehicles/${v.id}`,
  })
}

/**
 * One vehicle's page: photo gallery, rates, specs and its route packages
 * (fixed-price trips). Every price here leads straight into the booking wizard.
 */
export default async function VehiclePage({ params }: { params: Params }) {
  const [{ id }, locale, shop] = await Promise.all([params, getLocale(), currentShop()])
  const v = await liveVehicle(id)
  if (!v) notFound()
  const bn = locale === "bn"
  const name = vehicleName(v, locale)
  const photos = photosOf(v)
  const cover = photos[0] ? photoUrl(photos[0]) : null
  const category = v.offering.category
  const book = `/book/${category.slug}/${v.offering.slug}?vehicle=${v.id}`
  const owner = v.worker?.kind === "PARTNER" ? v.worker.user.name : null
  const detail = bn ? v.detailBn || v.detail : v.detail || v.detailBn
  const city = bn ? v.shop.cityBn : v.shop.city
  const hasRates = v.pricePerHour || v.pricePerHalfDay || v.pricePerDay

  return (
    <div className="mx-auto max-w-5xl">
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: named(locale, category), path: `/services/${category.slug}` }, { name, path: `/vehicles/${v.id}` }])} />
      <PageHeader back={`/services/${category.slug}`} title={name} sub={`${named(locale, v.offering)} · ${v.seats} ${pick(locale, "সিট", "seats")} · ${owner ? pick(locale, `পার্টনার: ${owner}`, `Partner: ${owner}`) : pick(locale, "HANDYO-র নিজের গাড়ি", "HANDYO fleet")}${v.shopId !== shop.id ? ` · ${city}` : ""}`} />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="relative overflow-hidden rounded-3xl bg-canvas">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={name} className="aspect-[16/10] w-full object-cover" />
            ) : category.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={category.image} alt="" className="aspect-[16/10] w-full object-cover" />
            ) : null}
            <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">{named(locale, v.offering)}</span>
            {v.worker && v.worker.ratingCount > 0 ? <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-amber-600"><Star className="size-3.5 fill-current" aria-hidden /> {v.worker.rating.toFixed(1)}</span> : null}
          </div>
          {photos.length > 1 ? (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {photos.slice(1, 5).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={photoUrl(p)} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy" />
              ))}
            </div>
          ) : null}
          {detail ? <p className="mt-4 text-[15px] text-muted-foreground">{detail}</p> : null}
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-bold text-ink">
            <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-3 py-1.5"><Users className="size-3.5" aria-hidden /> {pick(locale, `${v.seats} সিট`, `${v.seats} seats`)}</span>
            {v.plate ? <span className="rounded-full bg-canvas px-3 py-1.5">{v.plate}</span> : null}
            {specsOf(v).map((s) => <span key={s} className="rounded-full bg-paper px-3 py-1.5 ring-1 ring-line">{s}</span>)}
          </div>
        </div>

        <div className="space-y-4">
          {hasRates ? (
            <section className="card p-4">
              <h2 className="text-base font-extrabold text-ink">{pick(locale, "ভাড়া", "Rates")}</h2>
              <ul className="mt-2 divide-y divide-line text-sm">
                {v.pricePerHour ? <li className="flex items-center justify-between py-2"><span>{pick(locale, `প্রতি ঘণ্টা (কমপক্ষে ${v.minHours})`, `Per hour (min ${v.minHours})`)}</span><span className="font-extrabold text-ink">{taka(v.pricePerHour, locale)}</span></li> : null}
                {v.pricePerHalfDay ? <li className="flex items-center justify-between py-2"><span>{pick(locale, "হাফ-ডে (৬ ঘণ্টা)", "Half-day (6 hours)")}</span><span className="font-extrabold text-ink">{taka(v.pricePerHalfDay, locale)}</span></li> : null}
                {v.pricePerDay ? <li className="flex items-center justify-between py-2"><span>{pick(locale, "সারা দিন", "Full day")}</span><span className="font-extrabold text-ink">{taka(v.pricePerDay, locale)}</span></li> : null}
              </ul>
              <Link href={book} className="btn-primary mt-3 h-11 w-full justify-center text-sm">{pick(locale, "ঘণ্টা / দিনে বুক করুন", "Book by hour / day")}</Link>
            </section>
          ) : null}

          {v.routes.length ? (
            <section className="card overflow-hidden">
              <div className="p-4 pb-2">
                <h2 className="text-base font-extrabold text-ink">{pick(locale, "রুট ও দাম", "Routes & prices")}</h2>
                <p className="text-xs text-muted-foreground">{pick(locale, "ফিক্সড দামের ট্রিপ, ড্রাইভারসহ। একটা বেছে বুক করুন।", "Fixed-price trips with driver. Pick one and book.")}</p>
              </div>
              <ul className="divide-y divide-line">
                {v.routes.map((r) => (
                  <li key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-extrabold text-ink"><MapPin className="mr-1 inline size-4 text-brand" aria-hidden />{r.name}</p>
                      {r.spots ? <p className="mt-0.5 text-sm text-muted-foreground">{r.spots}</p> : null}
                      <p className="mt-1 flex flex-wrap gap-x-3 text-xs font-bold text-muted-foreground">
                        {r.hours ? <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden /> {r.hours}</span> : null}
                        {r.capacity ? <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden /> {r.capacity}</span> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <span className="text-xl font-extrabold text-brand">{taka(r.price, locale)}</span>
                      <Link href={`${book}&route=${r.id}`} className="btn-soft h-10 px-4 text-sm font-extrabold ring-1 ring-brand/30">{pick(locale, "এই রুট বুক করুন", "Book this route")}</Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!hasRates && !v.routes.length ? <p className="card p-4 text-sm text-muted-foreground">{pick(locale, "এই গাড়ির দাম এখনো দেওয়া হয়নি।", "No prices set for this vehicle yet.")}</p> : null}
          <TrustStrip locale={locale} />
          <p className="text-xs text-muted-foreground">{pick(locale, "বুকিংয়ের পর HANDYO অফিস গাড়ির মালিকের সাথে মিলিয়ে দেয়; সময় ও পিকআপ চ্যাটে ঠিক হয়। পেমেন্ট কাজ শেষে ক্যাশ / বিকাশ / নগদ।", "After booking, the HANDYO office connects you with the owner; time and pickup are settled in chat. Pay cash / bKash / Nagad when done.")}</p>
        </div>
      </div>
    </div>
  )
}
