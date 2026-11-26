import Link from "next/link"
import { ArrowRight, Star } from "lucide-react"
import type { Locale } from "@/lib/format"
import { num, taka } from "@/lib/format"
import { pick } from "@/lib/i18n"
import { marketVehicles, photosOf, photoUrl } from "@/lib/vehicles"
import { marketProperties } from "@/lib/stays"
import { liveProducts, liveStores } from "@/lib/shop"
import { db } from "@/lib/db"
import { CategoryIcon } from "@/components/category-icon"

type Cat = { id: string; slug: string; name: string; nameBn: string; icon: string; image: string; flow: string }

type Tile = {
  cat: Cat
  /** "২৪টা গাড়ি · ৩ ধরন" style fact line. */
  fact: string
  /** "৳৫০০/ঘণ্টা থেকে" style price line. */
  price: string
  /** Up to three preview photos of real items. */
  previews: string[]
  more: number
  rating: number | null
  cta: string
}

const min = (xs: number[]) => (xs.length ? Math.min(...xs) : 0)

/**
 * The four marketplace tiles on the home page, filled with live facts:
 * how many vehicles / resorts / products are on sale right now, the cheapest
 * price, and three real item photos as a preview strip.
 */
export async function MarketTiles({ locale, shopId, categories }: { locale: Locale; shopId: string; categories: Cat[] }) {
  const bn = locale === "bn"
  const by = (slug: string) => categories.find((c) => c.slug === slug)
  const [ship, rental, stay, shutki, achar] = [by("saint-martin-ship"), by("rent-a-car"), by("resort-booking"), by("shutki"), by("achar")]
  const [vehicles, properties, stores, shutkiProducts, acharProducts] = await Promise.all([
    rental ? marketVehicles() : [],
    stay ? marketProperties() : [],
    shutki || achar ? liveStores(shopId) : [],
    shutki ? liveProducts(shopId, shutki.id) : [],
    achar ? liveProducts(shopId, achar.id) : [],
  ])

  const tiles: Tile[] = []
  if (ship) {
    const offers = await db.serviceOffering.findMany({ where: { categoryId: ship.id, active: true }, select: { price: true, pricing: true } })
    const perPerson = offers.filter((o) => o.pricing === "PER_PERSON" && o.price > 0).map((o) => o.price)
    tiles.push({
      cat: ship,
      fact: pick(locale, `${num(offers.length, locale)} ধরনের টিকিট · কক্সবাজার ঘাট থেকে`, `${offers.length} ticket types · from Cox's Bazar jetty`),
      price: perPerson.length ? pick(locale, `আসা-যাওয়া ${taka(min(perPerson), locale)}/জন থেকে · ই-টিকিট`, `round trip from ${taka(min(perPerson), locale)}/person · e-ticket`) : pick(locale, "টিকিট ও দাম দেখুন", "See tickets and prices"),
      previews: [],
      more: 0,
      rating: null,
      cta: pick(locale, "টিকিট বুক করুন", "Book tickets"),
    })
  }
  if (rental) {
    const types = new Set(vehicles.map((v) => v.offeringId))
    const hourly = vehicles.map((v) => v.pricePerHour).filter((p) => p > 0)
    const daily = vehicles.flatMap((v) => [v.pricePerDay, ...v.routes.map((r) => r.price)]).filter((p) => p > 0)
    const rated = vehicles.map((v) => v.worker?.rating ?? 0).filter((r) => r > 0)
    const previews = vehicles.map((v) => photosOf(v)[0]).filter(Boolean).slice(0, 3).map(photoUrl)
    tiles.push({
      cat: rental,
      fact: pick(locale, `${num(vehicles.length, locale)}টা গাড়ি · ${num(types.size, locale)} ধরন`, `${vehicles.length} vehicles · ${types.size} types`),
      price: hourly.length
        ? pick(locale, `${taka(min(hourly), locale)}/ঘণ্টা থেকে · ড্রাইভারসহ অপশন`, `from ${taka(min(hourly), locale)}/hour · driver options`)
        : daily.length
          ? pick(locale, `${taka(min(daily), locale)}/দিন থেকে`, `from ${taka(min(daily), locale)}/day`)
          : pick(locale, "দাম দেখে বুক করুন", "See rates and book"),
      previews,
      more: Math.max(0, vehicles.length - previews.length),
      rating: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null,
      cta: pick(locale, "গাড়ি দেখুন", "See vehicles"),
    })
  }
  if (stay) {
    const nightly = properties.flatMap((p) => p.rooms.map((r) => r.pricePerNight)).filter((p) => p > 0)
    const rooms = properties.reduce((n, p) => n + p.rooms.length, 0)
    const previews = properties.map((p) => photosOf(p)[0]).filter(Boolean).slice(0, 3).map(photoUrl)
    tiles.push({
      cat: stay,
      fact: pick(locale, `${num(properties.length, locale)}টা রিসোর্ট · ${num(rooms, locale)} ধরনের রুম`, `${properties.length} resorts · ${rooms} room types`),
      price: nightly.length ? pick(locale, `রাতপ্রতি ${taka(min(nightly), locale)} থেকে`, `from ${taka(min(nightly), locale)}/night`) : pick(locale, "রুম ও দাম দেখুন", "See rooms and prices"),
      previews,
      more: Math.max(0, properties.length - previews.length),
      rating: null,
      cta: pick(locale, "রুম দেখুন", "See rooms"),
    })
  }
  for (const [cat, products] of [[shutki, shutkiProducts], [achar, acharProducts]] as Array<[Cat | undefined, typeof shutkiProducts]>) {
    if (!cat) continue
    const prices = products.flatMap((p) => p.variants.filter((v) => v.active).map((v) => v.price)).filter((p) => p > 0)
    const storeIds = new Set(products.map((p) => p.storeId).filter(Boolean))
    const previews = products.map((p) => photosOf(p)[0]).filter(Boolean).slice(0, 3).map(photoUrl)
    tiles.push({
      cat,
      fact: pick(locale, `${num(products.length, locale)}টা পণ্য · ${num(storeIds.size || stores.length, locale)}টা দোকান`, `${products.length} products · ${storeIds.size || stores.length} stores`),
      price: prices.length ? pick(locale, `${taka(min(prices), locale)} থেকে · সারা দেশে ডেলিভারি`, `from ${taka(min(prices), locale)} · delivered nationwide`) : pick(locale, "সারা দেশে ডেলিভারি", "Delivered nationwide"),
      previews,
      more: Math.max(0, products.length - previews.length),
      rating: null,
      cta: pick(locale, "দোকানে যান", "Shop now"),
    })
  }
  if (!tiles.length) return null

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {tiles.map((t, i) => {
        const big = i === 0
        return (
          <Link
            key={t.cat.id}
            href={`/services/${t.cat.slug}`}
            className={`tile group ${big ? "col-span-2 min-h-64 md:col-span-2 md:row-span-2 md:min-h-[26rem]" : "min-h-52 md:min-h-48"}`}
            aria-label={`${bn ? t.cat.nameBn : t.cat.name} · ${t.fact}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {t.cat.image ? <img src={t.cat.image} alt="" loading={big ? "eager" : "lazy"} /> : null}
            <span className="tile-shade" aria-hidden />
            <span className="absolute top-3 left-3 flex items-center gap-1.5 md:top-4 md:left-4">
              <span className="glass inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-extrabold">{t.fact}</span>
              {t.rating ? <span className="glass inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-extrabold"><Star className="size-3 fill-current text-amber-300" aria-hidden /> {t.rating.toFixed(1)}</span> : null}
            </span>
            <span className={`absolute inset-x-0 bottom-0 flex flex-col gap-2 ${big ? "p-4 md:p-6" : "p-3.5 md:p-4"}`}>
              <span className="flex items-end justify-between gap-3">
                <span className="min-w-0">
                  <span className="glass inline-grid size-9 place-items-center rounded-xl" aria-hidden><CategoryIcon name={t.cat.icon} className="size-4" /></span>
                  <span className={`display mt-2 block font-extrabold leading-tight ${big ? "text-2xl md:text-4xl" : "text-base md:text-xl"}`}>{bn ? t.cat.nameBn : t.cat.name}</span>
                  <span className={`mt-1 block font-bold text-white/90 ${big ? "text-sm md:text-base" : "text-xs"}`}>{t.price}</span>
                </span>
                {big && t.previews.length ? (
                  <span className="hidden shrink-0 items-center sm:flex" aria-hidden>
                    {t.previews.map((src, k) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={k} src={src} alt="" loading="lazy" className={`${big ? "size-12 md:size-14" : "size-9"} relative -ml-2 rounded-full object-cover ring-2 ring-white/80 first:ml-0`} />
                    ))}
                    {t.more ? <span className={`${big ? "size-12 text-sm md:size-14" : "size-9 text-[11px]"} glass -ml-2 grid place-items-center rounded-full font-extrabold`}>+{num(t.more, locale)}</span> : null}
                  </span>
                ) : null}
              </span>
              <span className={`inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3.5 text-ink transition group-hover:bg-brand group-hover:text-white ${big ? "h-10 text-sm font-extrabold" : "h-8 text-xs font-extrabold"}`}>
                {t.cta} <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
