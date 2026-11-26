import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Clock3 } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { categoryBySlug, fromPrice } from "@/lib/catalog"
import { currentShop } from "@/lib/shops"
import { named, pick, words } from "@/lib/i18n"
import { taka, num } from "@/lib/format"
import { PRICING_TEXT, unitLabel } from "@/lib/pricing"
import { marketVehicles, photoUrl, photosOf, specsOf, vehicleName } from "@/lib/vehicles"
import { VehicleMarket, type MarketVehicle } from "@/components/vehicle-market"
import { fromNight, kindText, listOf, marketProperties, propertyName } from "@/lib/stays"
import { StayMarket, type MarketProperty } from "@/components/stay-market"
import { laundryRules, liveProducts, liveStores, shopGroups, shopRules } from "@/lib/shop"
import { getSettings } from "@/lib/settings"
import { availability, isTicketCategory } from "@/lib/tickets"
import { ShopMarket } from "@/components/shop-market"
import { clip, pageMeta, categoryKeywords } from "@/lib/seo"
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
    keywords: categoryKeywords(category, { bn: shop.cityBn, en: shop.city }),
  })
}

export default async function CategoryPage({ params }: { params: Params }) {
  const [{ slug }, locale, shop] = await Promise.all([params, getLocale(), currentShop()])
  const category = await categoryBySlug(shop.id, slug)
  if (!category) notFound()
  const t = words(locale)
  const bn = locale === "bn"
  const rental = category.flow === "RENTAL"
  const stay = category.flow === "STAY"
  const shopFlow = category.flow === "SHOP"
  const laundryFlow = category.flow === "LAUNDRY"
  const [products, groups, settings, stores] = shopFlow || laundryFlow ? await Promise.all([liveProducts(shop.id, category.id, laundryFlow), shopGroups(shop.id, true, category.id), getSettings(shop.id), liveStores(shop.id)]) : [[], [], null, []]
  // The hidden per-piece offering only exists for the item orders; it is not a wizard card.
  const offerings = category.offerings.filter((o) => !(laundryFlow && o.slug === "by-item"))
  const ticket = isTicketCategory(category)
  const left = ticket ? await availability(offerings.map((o) => o.id)) : null
  const stays: MarketProperty[] = stay
    ? (await marketProperties()).map((p) => {
        const cover = photosOf(p)[0]
        return {
          id: p.id,
          name: propertyName(p, locale),
          kind: p.kind,
          kindText: kindText(p.kind, locale),
          areaId: p.areaId,
          area: named(locale, p.area),
          cover: cover ? photoUrl(cover) : null,
          fromNight: fromNight(p),
          amenities: listOf(p.amenities).slice(0, 4),
          rating: p.worker && p.worker.ratingCount > 0 ? p.worker.rating : null,
          roomCount: p.rooms.filter((r) => r.active).length,
          city: p.shopId === shop.id ? null : bn ? p.shop.cityBn : p.shop.city,
          href: `/stays/${p.id}`,
          paused: p.status === "PAUSED",
        }
      })
    : []
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
            cover: cover ? photoUrl(cover) : null,
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
            detailHref: `/vehicles/${v.id}`,
            routeCount: v.routes.length,
            paused: v.status === "PAUSED",
            fromRoute: v.routes.length ? Math.min(...v.routes.map((r) => r.price)) : 0,
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
      {category.image ? (
        <section className="relative mb-5 overflow-hidden rounded-[2rem] bg-ink text-white shadow-[0_20px_50px_rgba(11,31,58,0.2)]" aria-labelledby="cat-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={category.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-0 bg-[linear-gradient(to_right,rgba(5,15,35,0.92)_0%,rgba(5,15,35,0.7)_55%,rgba(5,15,35,0.25)_100%)]" aria-hidden />
          <div className="relative flex min-h-48 flex-col justify-end gap-2 p-5 md:min-h-60 md:p-8">
            <Link href="/services" className="glass inline-flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold">← {pick(locale, "সব সেবা", "All services")}</Link>
            <div className="flex items-center gap-3">
              <span className="glass grid size-11 shrink-0 place-items-center rounded-2xl" aria-hidden><CategoryIcon name={category.icon} className="size-5" /></span>
              <h1 id="cat-title" className="display text-2xl font-extrabold leading-tight md:text-4xl">{named(locale, category)}</h1>
            </div>
            <p className="max-w-2xl text-sm text-white/85 md:text-base">{bn ? category.blurbBn : category.blurb}</p>
          </div>
        </section>
      ) : (
        <PageHeader back="/services" title={named(locale, category)} sub={bn ? category.blurbBn : category.blurb} action={<span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand" aria-hidden><CategoryIcon name={category.icon} /></span>} />
      )}
      {category.flow === "LAUNDRY" ? (
        <p className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{pick(locale, "আমাদের রাইডার কাপড় নিয়ে যাবে, আমাদের লন্ড্রিতে পরিষ্কার হবে, রাইডারই ফেরত দেবে।", "Our rider collects, our laundry cleans, and the rider brings it back.")}</p>
      ) : null}
      {category.flow === "TEAM" ? (
        <p className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{pick(locale, "রুম সংখ্যা, টিমে কতজন আর কত দিন লাগবে বলুন। পুরো টিম পাঠানো হবে।", "Tell us the room count, team size and days. A full crew comes.")}</p>
      ) : null}
      {rental ? (
        <p className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{pick(locale, `পিকআপ পয়েন্ট (হোটেল বা বাসা) আর সময় দিন, গাড়ি বা বাইক সেখানেই পৌঁছে যাবে। ${shop.cityBn} এলাকার মধ্যে পিকআপ।`, `Give us a pickup point (hotel or home) and a time; the car or bike comes to you. Pickup inside ${shop.city}.`)}</p>
      ) : null}
      {laundryFlow && settings && products.length ? (
        <section className="mb-6">
          <h2 className="display text-xl font-extrabold text-ink">{pick(locale, "কাপড় বেছে পিস হিসেবে দিন", "Pick garments, priced per piece")}</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">{pick(locale, "প্রতিটা কাপড়ের জন্য সার্ভিস বেছে কার্টে নিন; রাইডার বাসা থেকে নিয়ে যাবে। কেজি হিসেবে দিতে চাইলে নিচের কার্ড থেকে বুক করুন।", "Choose a service per garment and add it to the cart; the rider collects from your door. Prefer by the kilo? Book from the cards below.")}</p>
          <ShopMarket
            locale={locale}
            mode="laundry"
            rules={laundryRules(settings)}
            groups={groups.map((g) => ({ id: g.id, name: named(locale, g) }))}
            stores={stores.filter((st) => products.some((p) => p.storeId === st.id)).map((st) => ({ id: st.id, slug: st.slug, name: named(locale, st), cover: photosOf(st)[0] ? photoUrl(photosOf(st)[0]) : null }))}
            partnerHref="/partner"
            products={products.map((p) => ({
              id: p.id,
              slug: p.slug,
              groupId: p.groupId,
              storeId: p.storeId,
              storeName: p.store ? named(locale, p.store) : "",
              name: bn ? p.nameBn || p.name : p.name || p.nameBn,
              cover: photosOf(p)[0] ? photoUrl(photosOf(p)[0]) : null,
              badge: p.badge,
              variants: p.variants.filter((v) => v.active).map((v) => ({ id: v.id, label: v.label, price: v.price, oldPrice: v.oldPrice, stock: v.stock })),
            }))}
          />
          <h2 className="display mt-8 text-xl font-extrabold text-ink">{pick(locale, "অথবা কেজি হিসেবে", "Or by the kilo")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{pick(locale, "অনেক কাপড় একসাথে? কেজি হিসেবে বুক করুন, রাইডার ওজন করে নেবে।", "A big load? Book by the kilo and the rider weighs it at pickup.")}</p>
        </section>
      ) : null}
      {shopFlow && settings ? (
        <section className="mb-6">
          <ShopMarket
            locale={locale}
            rules={shopRules(settings)}
            groups={groups.map((g) => ({ id: g.id, name: named(locale, g) }))}
            stores={stores.filter((st) => products.some((p) => p.storeId === st.id)).map((st) => ({ id: st.id, slug: st.slug, name: named(locale, st), cover: photosOf(st)[0] ? photoUrl(photosOf(st)[0]) : null }))}
            partnerHref="/partner"
            products={products.map((p) => ({
              id: p.id,
              slug: p.slug,
              groupId: p.groupId,
              storeId: p.storeId,
              storeName: p.store ? named(locale, p.store) : "",
              name: bn ? p.nameBn || p.name : p.name || p.nameBn,
              cover: photosOf(p)[0] ? photoUrl(photosOf(p)[0]) : null,
              badge: p.badge,
              variants: p.variants.filter((v) => v.active).map((v) => ({ id: v.id, label: v.label, price: v.price, oldPrice: v.oldPrice, stock: v.stock })),
            }))}
          />
        </section>
      ) : null}
      {stay ? (
        <section className="mb-6">
          <p className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{pick(locale, "তারিখ আর রুম বেছে বুক করুন; রিসোর্ট নিশ্চিত করলে নোটিশ পাবেন, চেক-ইনের আগে চ্যাটে সব ঠিক করে নিন। পেমেন্ট চেক-ইনে ক্যাশ / বিকাশ / নগদ।", "Pick dates and a room; you get a notice once the resort confirms, and settle details in chat before check-in. Pay at check-in by cash / bKash / Nagad.")}</p>
          <h2 className="display text-xl font-extrabold text-ink">{pick(locale, "রিসোর্ট, হোটেল ও কটেজ বেছে নিন", "Pick a resort, hotel or cottage")}</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">{pick(locale, "ছবি, সুবিধা আর রাতপ্রতি দাম দেখে পছন্দেরটা খুলুন।", "See photos, amenities and nightly prices, then open the one you like.")}</p>
          {!stays.length ? (
            <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted-foreground">{pick(locale, "এখনো কোনো রিসোর্ট যোগ হয়নি। রিসোর্ট বা হোটেলের মালিক হলে নিচে পার্টনার হোন।", "No properties listed yet. If you own a resort or hotel, become a partner below.")}</p>
          ) : (
            <StayMarket locale={locale} properties={stays} fallback={category.image || null} />
          )}
          <Link href="/partner" className="card mt-6 flex items-center justify-between gap-3 bg-brand-soft p-4 transition hover:ring-brand/40">
            <div>
              <p className="font-extrabold text-ink">{pick(locale, "আপনার রিসোর্ট বা হোটেল HANDYO-তে লিস্ট করুন", "List your resort or hotel on HANDYO")}</p>
              <p className="text-sm text-muted-foreground">{pick(locale, "রুম আর দাম আপনি ঠিক করেন; বুকিং, চ্যাট আর কাস্টমার আমরা আনি।", "You set rooms and prices; we bring bookings, chat and customers.")}</p>
            </div>
            <span className="shrink-0 font-extrabold text-brand">{pick(locale, "পার্টনার হোন →", "Become a partner →")}</span>
          </Link>
        </section>
      ) : null}
      {rental ? (
        <section className="mb-6">
          <h2 className="display text-xl font-extrabold text-ink">{pick(locale, "বাইক, কার, চান্দের গাড়ি ও বাস বেছে নিন", "Pick a bike, car, chander gari or bus")}</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">{pick(locale, "ছবি, স্পেক আর ভাড়া দেখে পছন্দেরটা বুক করুন; বুকিংয়ের পর অফিস গাড়ির মালিকের সাথে মিলিয়ে দেয়।", "See the photo, specs and rate, then book; the office connects you with the owner after booking.")}</p>
          {!market.length ? (
            <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted-foreground">{pick(locale, "এখনো কোনো গাড়ি যোগ হয়নি। শিগগিরই আসছে; আপনার গাড়ি থাকলে নিচে পার্টনার হোন।", "No vehicles are listed yet. Coming soon; if you own one, become a partner below.")}</p>
          ) : (
            <VehicleMarket
              locale={locale}
              fallback={category.image || null}
              types={category.offerings.map((o) => ({ id: o.id, name: named(locale, o) }))}
              vehicles={market}
            />
          )}
        </section>
      ) : null}
      {/* Rentals book a real vehicle from the marketplace above, never a bare type. */}
      <div className={rental || stay || shopFlow ? "hidden" : "grid gap-3 md:grid-cols-2"}>
        {offerings.map((o) => {
          const n = left && left.has(o.id) ? (left.get(o.id) ?? 0) : null
          const out = n !== null && n <= 0
          return (
          <Link key={o.id} href={out ? "#" : `/book/${category.slug}/${o.slug}`} aria-disabled={out} className={`card card-lift relative flex gap-3 overflow-hidden p-3 md:gap-4 md:p-4 ${out ? "opacity-70 grayscale-[0.4] pointer-events-none" : ""}`}>

            {o.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={o.image} alt="" loading="lazy" className="size-24 shrink-0 rounded-2xl object-cover ring-1 ring-line md:size-28" />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-extrabold leading-tight text-ink md:text-lg">{named(locale, o)}</h2>
              <span className="shrink-0 text-right">
                {o.pricing === "QUOTE" ? (
                  <span className="pill bg-brand-soft text-brand">{PRICING_TEXT.QUOTE[locale]}</span>
                ) : (
                  <span className="text-lg font-extrabold text-ink">{taka(o.price, locale)}<span className="text-xs font-semibold text-muted-foreground">/{unitLabel(o.pricing, locale)}</span></span>
                )}
              </span>
            </div>
            <p className="line-clamp-2 text-[13px] text-muted-foreground md:text-sm">{bn ? o.detailBn : o.detail}</p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs font-bold text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden /> {minutes(o.durationMin)}</span>
              {n !== null ? <span className={`pill ${out ? "bg-rose-100 text-rose-700" : n <= 10 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{out ? pick(locale, "স্টক আউট", "Stock out") : pick(locale, `${num(n, locale)}টা টিকিট আছে`, `${n} tickets left`)}</span> : null}
              {o.pricing === "QUOTE" && o.price > 0 ? <span>{pick(locale, `পরিদর্শন ফি ${taka(o.price, locale)}`, `Inspection ${taka(o.price, locale)}`)}</span> : null}
              <span className="text-brand">{out ? pick(locale, "শিগগির আবার", "Back soon") : `${t.bookNow} →`}</span>
            </div>
            </div>
          </Link>
          )
        })}
      </div>
      {ticket ? (
        <Link href="/partner" className="card mt-6 flex items-center justify-between gap-3 bg-brand-soft p-4 transition hover:ring-brand/40">
          <div>
            <p className="font-extrabold text-ink">{pick(locale, "শিপের টিকিট বিক্রি করেন? HANDYO এজেন্ট হোন", "Sell ship tickets? Become a HANDYO agent")}</p>
            <p className="text-sm text-muted-foreground">{pick(locale, "কত টিকিট আছে লিখে দিন; অর্ডার সরাসরি আপনার প্যানেলে, স্টক শেষ হলে নিজে থেকেই “স্টক আউট”।", "Enter how many tickets you hold; orders land in your panel and it shows “stock out” when they run out.")}</p>
          </div>
          <span className="shrink-0 font-extrabold text-brand">{pick(locale, "এজেন্ট হোন →", "Become an agent →")}</span>
        </Link>
      ) : null}
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
