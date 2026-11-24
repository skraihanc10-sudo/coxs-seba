import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BadgeCheck, Building2, Car, Clock3, Fish, Handshake, MapPin, MapPinned, MessageCircle, Phone, Search, ShieldCheck, Star } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { activeAreas, activeCategories, activeFaqs, categoryPriceLine, publishedReviews } from "@/lib/catalog"
import { activeShops, coverageText, currentShop } from "@/lib/shops"
import { named, pick, words } from "@/lib/i18n"
import { taka, telHref, whatsappHref } from "@/lib/format"
import { unitLabel } from "@/lib/pricing"
import { clip, pageMeta } from "@/lib/seo"
import { ofBn } from "@/lib/bangla"
import { CategoryIcon } from "@/components/category-icon"
import { HeroShowcase } from "@/components/hero-showcase"
import { faqLd, JsonLd, localBusiness, organization } from "@/components/seo/json-ld"
import { brand } from "@/theme/brand"

export async function generateMetadata(): Promise<Metadata> {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  const settings = await getSettings(shop.id)
  return pageMeta({
    locale,
    title: pick(locale, "HANDYO · কক্সবাজারে যা দরকার, সব এক অ্যাপে", "HANDYO · Everything you need in Cox's Bazar"),
    description: clip(
      pick(
        locale,
        `${shop.cityBn}: ঘরের সেবা, গাড়ি-বাইক-চান্দের গাড়ি ভাড়া, রিসোর্ট ও হোটেল বুকিং আর শুঁটকি-আচারের দোকান – যাচাই করা টিম ও পার্টনার, দাম আগেই লেখা। ${settings.bannerBn}`,
        `Laundry, electricians, plumbers, cleaning, AC, moving and car & bike rental in ${shop.city}: our own verified team, prices listed up front. ${settings.bannerEn}`,
      ),
    ),
    path: "/",
  })
}

export default async function HomePage() {
  const [locale, shop, shops, faqs] = await Promise.all([getLocale(), currentShop(), activeShops(), activeFaqs()])
  const [settings, categories, reviews, areas] = await Promise.all([getSettings(shop.id), activeCategories(shop.id), publishedReviews(shop.id), activeAreas(shop.id)])
  const t = words(locale)
  const bn = locale === "bn"
  const rental = categories.find((c) => c.slug === "rent-a-car")
  const MARKET_SLUGS = ["rent-a-car", "resort-booking", "shutki", "achar"]
  const markets = MARKET_SLUGS.map((slug) => categories.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => Boolean(c))
  const homeServices = categories.filter((c) => !MARKET_SLUGS.includes(c.slug))
  const stay = categories.find((c) => c.slug === "resort-booking")
  const shutki = categories.find((c) => c.slug === "shutki")
  const quick = [...markets, ...homeServices.slice(0, 3)]
  const areaCount = areas.length
  const firstArea = areas[0]
  const lastArea = areas[areas.length - 1]

  return (
    <div className="space-y-10 md:space-y-14">
      <JsonLd data={[organization(), localBusiness(shop, settings, areas), ...(faqs.length ? [faqLd(faqs.map((f) => ({ question: bn ? f.questionBn : f.question, answer: bn ? f.answerBn : f.answer })))] : [])]} />

      {/* Hero + search */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0b1f3a_0%,#0a3fb0_55%,#1259e8_100%)] px-5 py-8 text-white shadow-[0_24px_60px_rgba(11,31,58,0.25)] md:px-10 md:py-12 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden />
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-[#38bdf8]/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full bg-[#7c5cfc]/30 blur-3xl" aria-hidden />
        <div className="relative">
        <p className="pill glass inline-flex items-center gap-1 text-white"><MapPin className="size-3.5" aria-hidden /> {coverageText(shop, locale)}</p>
        <h1 id="hero-title" className="display mt-4 max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl">
          {bn ? settings.heroBn : settings.heroEn}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-white/80 md:text-lg">{bn ? settings.bannerBn : settings.bannerEn}</p>
        <form action="/services" role="search" className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.25)] ring-4 ring-white/10">
          <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <input name="q" aria-label={pick(locale, "সেবা খুঁজুন", "Search services")} placeholder={pick(locale, "কী লাগবে? যেমন: চান্দের গাড়ি, রিসোর্ট, শুঁটকি, এসি", "What do you need? e.g. chander gari, resort, dried fish, AC")} className="h-11 min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted-foreground" />
          <button className="btn-primary h-11 px-4 text-sm">{t.search}</button>
        </form>
        <div className="mt-5 -mx-5 scroll-x px-5 md:mx-0 md:flex-wrap md:px-0" aria-label={pick(locale, "জনপ্রিয় সেবা", "Popular services")}>
          {quick.map((c) => (
            <Link key={c.id} href={`/services/${c.slug}`} className="glass inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold text-white transition hover:bg-white hover:text-ink">
              <CategoryIcon name={c.icon} className="size-3.5" /> {named(locale, c)}
            </Link>
          ))}
        </div>
        <ul className="mt-6 grid max-w-xl grid-cols-3 gap-2 text-left" aria-label={pick(locale, "আমাদের প্রতিশ্রুতি", "Our promises")}>
          {[
            [ShieldCheck, pick(locale, "যাচাই করা", "Verified"), pick(locale, "কর্মী ও পার্টনার", "team & partners")],
            [BadgeCheck, pick(locale, "দাম আগেই", "Price up front"), pick(locale, "লুকানো চার্জ নেই", "no hidden charges")],
            [Clock3, pick(locale, "দ্রুত সেবা", "Fast service"), pick(locale, "ক্যাশ / বিকাশ / নগদ", "cash / bKash / Nagad")],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof ShieldCheck
            return (
              <li key={title as string} className="glass rounded-2xl px-3 py-2.5">
                <I className="size-4 text-[#7dd3fc]" aria-hidden />
                <p className="mt-1.5 text-[13px] font-extrabold leading-tight">{title as string}</p>
                <p className="text-[11px] text-white/70">{body as string}</p>
              </li>
            )
          })}
        </ul>
        </div>
        {/* Featured-services board: rotating illustrated cards, one per category. */}
        <div className="relative mt-7 lg:mt-0">
          <HeroShowcase
            locale={locale}
            items={categories
              .filter((c) => c.image)
              .map((c) => {
                return {
                  slug: c.slug,
                  name: c.name,
                  nameBn: c.nameBn,
                  image: c.image,
                  blurb: bn ? c.blurbBn : c.blurb,
                  priceLine: categoryPriceLine(c, locale, taka, unitLabel),
                }
              })}
          />
        </div>
      </section>

      {/* Marketplaces: the four photo tiles */}
      {markets.length ? (
        <section aria-labelledby="markets-title">
          <div className="section-head">
            <div>
              <p className="eyebrow">{pick(locale, "মার্কেটপ্লেস", "Marketplaces")}</p>
              <h2 id="markets-title" className="display mt-1 text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "ভাড়া, বুকিং আর কেনাকাটা", "Rent, book and shop")}</h2>
            </div>
            <Link href="/services" className="hidden text-sm font-bold text-brand sm:inline">{t.seeAll} →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {markets.map((c, i) => (
              <Link key={c.id} href={`/services/${c.slug}`} className={`tile group ${i === 0 ? "col-span-2 aspect-[2/1] md:col-span-2 md:aspect-auto md:row-span-2" : "aspect-[4/3] md:aspect-auto md:min-h-44"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.image ? <img src={c.image} alt="" loading={i === 0 ? "eager" : "lazy"} /> : null}
                <span className="tile-shade" aria-hidden />
                <span className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                  <span className="glass inline-grid size-9 place-items-center rounded-xl" aria-hidden><CategoryIcon name={c.icon} className="size-4" /></span>
                  <span className={`display mt-2 block font-extrabold leading-tight ${i === 0 ? "text-xl md:text-3xl" : "text-base md:text-xl"}`}>{named(locale, c)}</span>
                  <span className="mt-1 line-clamp-2 block text-xs text-white/80 md:text-sm">{categoryPriceLine(c, locale, taka, unitLabel)}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-white">{pick(locale, "দেখুন", "Open")} <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden /></span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Home services */}
      {homeServices.length ? (
        <section aria-labelledby="services-title">
          <div className="section-head">
            <div>
              <p className="eyebrow">{pick(locale, "ঘরের সেবা", "Home services")}</p>
              <h2 id="services-title" className="display mt-1 text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "ঘরে বসে ডাকুন আমাদের টিমকে", "Call our own team to your door")}</h2>
            </div>
            <Link href="/services" className="text-sm font-bold text-brand">{t.seeAll} →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {homeServices.map((c) => (
              <Link key={c.id} href={`/services/${c.slug}`} className="card card-lift group flex flex-col overflow-hidden">
                {c.image ? (
                  <span className="relative block aspect-[5/3] w-full overflow-hidden bg-brand-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute top-2 left-2 grid size-8 place-items-center rounded-xl bg-white/90 text-brand shadow" aria-hidden><CategoryIcon name={c.icon} className="size-4" /></span>
                  </span>
                ) : null}
                <span className="flex flex-1 flex-col gap-1 p-3.5">
                  <span className="text-[15px] font-extrabold leading-snug text-ink">{named(locale, c)}</span>
                  <span className="mt-auto text-xs font-bold text-brand">{categoryPriceLine(c, locale, taka, unitLabel)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Three promo panels */}
      <section aria-label={pick(locale, "বিশেষ অফার", "Highlights")} className="grid gap-3 md:grid-cols-3 md:gap-4">
        {rental ? (
          <Link href={`/services/${rental.slug}`} className="card-lift relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0f766e,#14b8a6)] p-5 text-white md:p-6">
            <Car className="pointer-events-none absolute -right-5 -bottom-5 size-32 text-white/10" aria-hidden />
            <p className="pill glass text-white">{named(locale, rental)}</p>
            <h2 className="display mt-3 text-xl font-extrabold leading-tight md:text-2xl">{pick(locale, "মেরিন ড্রাইভে চান্দের গাড়ি, কার বা বাইক", "Chander gari, car or bike for Marine Drive")}</h2>
            <p className="mt-2 text-sm text-white/85">{pick(locale, "ছবি ও রুট-প্যাকেজ দেখে বুক করুন। ড্রাইভারসহ অপশন আছে।", "See photos and route packages, then book. Driver options included.")}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold">{pick(locale, "গাড়ি দেখুন", "See vehicles")} <ArrowRight className="size-4" aria-hidden /></span>
          </Link>
        ) : null}
        {stay ? (
          <Link href={`/services/${stay.slug}`} className="card-lift relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#1e3a8a,#3b82f6)] p-5 text-white md:p-6">
            <Building2 className="pointer-events-none absolute -right-5 -bottom-5 size-32 text-white/10" aria-hidden />
            <p className="pill glass text-white">{named(locale, stay)}</p>
            <h2 className="display mt-3 text-xl font-extrabold leading-tight md:text-2xl">{pick(locale, "সৈকতের পাশে রিসোর্ট, হোটেল ও কটেজ", "Resorts, hotels and cottages by the beach")}</h2>
            <p className="mt-2 text-sm text-white/85">{pick(locale, "পার্টনার রিসোর্টের রুম ও রাতপ্রতি দাম এক জায়গায়। তারিখ দিন, বুক হয়ে যাবে।", "Partner resorts' rooms and nightly prices in one place. Pick dates and book.")}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold">{pick(locale, "রুম দেখুন", "See rooms")} <ArrowRight className="size-4" aria-hidden /></span>
          </Link>
        ) : null}
        {shutki ? (
          <Link href={`/services/${shutki.slug}`} className="card-lift relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#9a3412,#f97316)] p-5 text-white md:p-6">
            <Fish className="pointer-events-none absolute -right-5 -bottom-5 size-32 text-white/10" aria-hidden />
            <p className="pill glass text-white">{pick(locale, "শুঁটকি ও আচার", "Dried fish & pickles")}</p>
            <h2 className="display mt-3 text-xl font-extrabold leading-tight md:text-2xl">{pick(locale, "কক্সবাজারের শুঁটকি, সারা দেশে ডেলিভারি", "Cox's Bazar dried fish, delivered nationwide")}</h2>
            <p className="mt-2 text-sm text-white/85">{pick(locale, "বিসমিল্লাহ, মহেশখালী আর অর্গানিক দোকানের পণ্য কার্টে নিন; দোকান অনুযায়ী আলাদা পার্সেল।", "Products from partner stores in one cart; a separate parcel per store.")}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold">{pick(locale, "দোকানে যান", "Shop now")} <ArrowRight className="size-4" aria-hidden /></span>
          </Link>
        ) : null}
      </section>

      {/* How it works */}
      <section aria-labelledby="how-title" className="card relative overflow-hidden p-5 md:p-8">
        <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-brand-soft blur-3xl" aria-hidden />
        <p className="eyebrow">{pick(locale, "৩ ধাপে", "3 steps")}</p>
        <h2 id="how-title" className="display mt-1 text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "কীভাবে কাজ করে", "How it works")}</h2>
        <ol className="relative mt-6 grid gap-5 md:grid-cols-3 md:gap-6">
          {[
            [pick(locale, "সেবা বেছে নিন", "Pick a service"), pick(locale, "সেবা আর অপশন বাছুন, আনুমানিক দাম সাথে সাথে দেখুন।", "Choose the service and options and see the estimate right away.")],
            [pick(locale, "ঠিকানা আর সময় দিন", "Add address & time"), pick(locale, `${shop.cityBn} এলাকা, বাড়ির ঠিকানা আর পছন্দের সময় দিন। মোবাইল নম্বর দিলেই হবে।`, `Your ${shop.city} area, address and a time slot. A mobile number is all you need.`)],
            [pick(locale, "কর্মী আসবেন", "The worker arrives"), pick(locale, "আমাদের যাচাই করা কর্মী সময়মতো আসবেন। কাজ শেষে ক্যাশ, বিকাশ বা নগদে দিন।", "Our verified worker comes on time. Pay cash, bKash or Nagad when it's done.")],
          ].map(([title, body], i) => (
            <li key={title} className="relative flex gap-4 rounded-2xl bg-canvas/70 p-4 ring-1 ring-line/70">
              <span className="step-dot" aria-hidden>{i + 1}</span>
              <div>
                <p className="font-extrabold text-ink">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/services" className="btn-primary h-11 px-5 text-sm">{pick(locale, "সেবা বেছে নিন", "Pick a service")} <ArrowRight className="size-4" aria-hidden /></Link>
          <Link href="/how-it-works" className="btn-ghost h-11 bg-paper px-5 text-sm">{pick(locale, "বিস্তারিত দেখুন", "Read more")}</Link>
        </div>
      </section>

      {/* Why us */}
      <section aria-labelledby="why-title">
        <p className="eyebrow">{pick(locale, "ভরসা", "Trust")}</p>
        <h2 id="why-title" className="display mt-1 text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "কেন HANDYO", "Why HANDYO")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [ShieldCheck, pick(locale, "যাচাই করা কর্মী", "Verified workers"), pick(locale, "প্রতিটা কর্মীর NID যাচাই করা, আমাদের নিজের টিম।", "Every worker is NID-checked and on our own team.")],
            [BadgeCheck, pick(locale, "নির্দিষ্ট দাম", "Fixed prices"), pick(locale, "দাম আগেই লেখা। লুকানো চার্জ নেই।", "Prices are listed up front. No hidden charges.")],
            [Clock3, pick(locale, "দ্রুত আসি", "We come fast"), pick(locale, "আজকেরটা আজই, বেশিরভাগ কাজ ২ ঘণ্টার স্লটে।", "Same-day for most jobs, in 2-hour slots.")],
            [
              MapPinned,
              pick(locale, `${ofBn(shop.cityBn)} সব এলাকায়`, `All of ${shop.city}`),
              areaCount && firstArea && lastArea
                ? pick(locale, `${named(locale, firstArea)} থেকে ${named(locale, lastArea)}, ${ofBn(shop.cityBn)} ${areaCount}টা এলাকায়।`, `${named(locale, firstArea)} to ${named(locale, lastArea)}: all ${areaCount} ${shop.city} areas.`)
                : pick(locale, `${ofBn(shop.cityBn)} সব এলাকায় সেবা দিই।`, `We serve every area of ${shop.city}.`),
            ],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof ShieldCheck
            return (
              <div key={title as string} className="card card-lift p-5">
                <span className="icon-tile" aria-hidden><I className="size-5" /></span>
                <p className="mt-3 font-extrabold text-ink">{title as string}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body as string}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Where we are */}
      {shops.length > 1 ? (
        <section aria-labelledby="where-title">
          <div className="section-head">
            <h2 id="where-title" className="display text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "আমরা যেখানে আছি", "Where we are")}</h2>
            <Link href="/branches" className="text-sm font-bold text-brand">{pick(locale, "সব শাখা", "All branches")} →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => (
              <Link key={s.id} href={`/branches/${s.slug}`} className={`card card-lift flex items-start gap-3 p-4 ${s.id === shop.id ? "ring-brand/50" : ""}`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden><MapPin className="size-5" /></span>
                <span className="min-w-0">
                  <span className="block font-extrabold text-ink">{bn ? s.cityBn : s.city}</span>
                  <span className="block truncate text-xs text-muted-foreground">{bn ? s.nameBn : s.name}{s.id === shop.id ? ` · ${pick(locale, "এখন দেখছেন", "viewing now")}` : ""}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Reviews */}
      {reviews.length ? (
        <section aria-labelledby="reviews-title">
          <p className="eyebrow">{pick(locale, "রিভিউ", "Reviews")}</p>
          <h2 id="reviews-title" className="display mt-1 text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "কাস্টমাররা যা বলেন", "What customers say")}</h2>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {reviews.map((r) => (
              <figure key={r.id} className="card card-lift w-72 shrink-0 p-5 md:w-auto">
                <div className="flex gap-0.5 text-amber-400" aria-label={pick(locale, `${r.rating} তারা`, `${r.rating} stars`)} role="img">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="size-4 fill-current" aria-hidden />)}
                </div>
                <blockquote className="mt-3 text-[15px] text-ink">“{r.comment}”</blockquote>
                <figcaption className="mt-3 text-xs text-muted-foreground">
                  <span className="font-bold text-ink">{r.customer.name}</span> · {named(locale, r.booking.offering)} · {named(locale, r.booking.area)}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* Partner CTA */}
      <section aria-labelledby="partner-title" className="relative overflow-hidden rounded-[2rem] bg-ink px-5 py-8 text-white md:px-10 md:py-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden />
        <div className="pointer-events-none absolute -right-20 -bottom-24 size-72 rounded-full bg-brand/40 blur-3xl" aria-hidden />
        <div className="relative grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="pill glass inline-flex items-center gap-1 text-white"><Handshake className="size-3.5" aria-hidden /> {pick(locale, "পার্টনার হোন", "Become a partner")}</p>
            <h2 id="partner-title" className="display mt-3 text-2xl font-extrabold leading-tight md:text-3xl">{pick(locale, "আপনার গাড়ি, রিসোর্ট বা দোকান HANDYO-তে আনুন", "Bring your vehicle, resort or store to HANDYO")}</h2>
            <p className="mt-2 max-w-lg text-sm text-white/75 md:text-base">{pick(locale, "আপনি দাম ঠিক করেন, অর্ডার-চ্যাট-পেমেন্ট আমরা সামলাই। প্রতিটা অর্ডারের ৯০% আপনার, HANDYO রাখে মাত্র ১০%।", "You set the price; we handle orders, chat and payment. You keep 90% of every order, HANDYO keeps only 10%.")}</p>
          </div>
          <div className="grid gap-2">
            {[
              ["/partner", Car, pick(locale, "গাড়ি ভাড়া দিন", "Rent out your vehicle"), pick(locale, "বাইক, কার, চান্দের গাড়ি, বাস", "Bike, car, chander gari, bus")],
              ["/partner/resort", Building2, pick(locale, "রিসোর্ট যুক্ত করুন", "List your resort"), pick(locale, "রুম ও রাতপ্রতি দাম আপনার হাতে", "Rooms and nightly prices, your call")],
              ["/partner/store", Fish, pick(locale, "দোকান খুলুন", "Open a store"), pick(locale, "শুঁটকি বা আচার, সারা দেশে অর্ডার", "Dried fish or pickles, orders nationwide")],
            ].map(([href, Icon, title, body]) => {
              const I = Icon as typeof Car
              return (
                <Link key={href as string} href={href as string} className="glass flex items-center gap-3 rounded-2xl p-3.5 transition hover:bg-white hover:text-ink">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15" aria-hidden><I className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold">{title as string}</span>
                    <span className="block text-xs opacity-75">{body as string}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Helpline */}
      <section aria-label={pick(locale, "হেল্পলাইন", "Helpline")} className="card flex flex-col gap-4 bg-[linear-gradient(135deg,#eaf1ff,#f5f7fb)] p-5 ring-0 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <p className="display text-xl font-extrabold text-ink md:text-2xl">{pick(locale, "কথা বলতে চান?", "Want to talk first?")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{bn ? settings.officeHours : settings.officeHoursEn} · {settings.helpline}</p>
        </div>
        <div className="flex gap-2">
          <a href={telHref(settings.helpline)} className="btn-primary flex-1 md:flex-none"><Phone className="size-4" aria-hidden /> {t.call}</a>
          <a href={whatsappHref(settings.whatsapp, pick(locale, "আসসালামু আলাইকুম, HANDYO থেকে একটা সেবা নিতে চাই।", "Hi, I'd like to book a service with HANDYO."))} className="btn-ghost flex-1 bg-paper md:flex-none"><MessageCircle className="size-4" aria-hidden /> {t.whatsapp}</a>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title">
        <p className="eyebrow">{pick(locale, "প্রশ্নোত্তর", "FAQ")}</p>
        <h2 id="faq-title" className="display mt-1 text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "সাধারণ প্রশ্ন", "Common questions")}</h2>
        <div className="mt-4 space-y-2">
          {faqs.map((f) => (
            <details key={f.id} className="card group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-extrabold text-ink">
                {bn ? f.questionBn : f.question}
                <span className="text-brand transition group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{bn ? f.answerBn : f.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{brand.name} · {bn ? shop.nameBn : shop.name} · {pick(locale, `${shop.cityBn}, বাংলাদেশ`, `${shop.city}, Bangladesh`)}</p>
      </section>
    </div>
  )
}
