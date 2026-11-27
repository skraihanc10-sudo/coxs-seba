import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BadgeCheck, Building2, Car, Clock3, Fish, Handshake, MapPin, MessageCircle, Phone, ShieldCheck, Sparkles, Star, Store } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { activeAreas, activeCategories, activeFaqs, categoryPriceLine, publishedReviews } from "@/lib/catalog"
import { coverageText, currentShop } from "@/lib/shops"
import { named, pick, words } from "@/lib/i18n"
import { taka, telHref, whatsappHref } from "@/lib/format"
import { unitLabel } from "@/lib/pricing"
import { clip, pageMeta } from "@/lib/seo"
import { CategoryIcon } from "@/components/category-icon"
import { HeroShowcase } from "@/components/hero-showcase"
import { MarketTiles } from "@/components/market-tiles"
import { VideoReviews } from "@/components/video-reviews"
import { ReviewShots } from "@/components/review-shots"
import { youtubeIds } from "@/lib/youtube"
import { SearchBox } from "@/components/search-box"
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
  const [locale, shop, faqs] = await Promise.all([getLocale(), currentShop(), activeFaqs()])
  const [settings, categories, reviews, areas] = await Promise.all([getSettings(shop.id), activeCategories(shop.id), publishedReviews(shop.id), activeAreas(shop.id)])
  const t = words(locale)
  const bn = locale === "bn"
  const rental = categories.find((c) => c.slug === "rent-a-car")
  const MARKET_SLUGS = ["saint-martin-ship", "rent-a-car", "resort-booking", "shutki", "achar"]
  const markets = MARKET_SLUGS.map((slug) => categories.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => Boolean(c))
  const homeServices = categories.filter((c) => !MARKET_SLUGS.includes(c.slug))
  const stay = categories.find((c) => c.slug === "resort-booking")
  const shutki = categories.find((c) => c.slug === "shutki")
  // Dried fish and pickles are one shop; home and resort cleaning are one door.
  const CLEANING = ["home-cleaning", "resort-cleaning"]
  const shopChip = shutki ? { key: "shop", href: "/shop", icon: "store", label: pick(locale, "দোকান", "Shop") } : null
  const quick = [
    ...markets.filter((c) => c.slug !== "shutki" && c.slug !== "achar").map((c) => ({ key: c.id, href: `/services/${c.slug}`, icon: c.icon, label: named(locale, c) })),
    ...(shopChip ? [shopChip] : []),
    ...homeServices.filter((c) => !CLEANING.includes(c.slug)).slice(0, 3).map((c) => ({ key: c.id, href: `/services/${c.slug}`, icon: c.icon, label: named(locale, c) })),
  ]
  const cleaning = homeServices.filter((c) => CLEANING.includes(c.slug))
  type HomeTile = { key: string; href: string; image: string; icon: string; name: string; price: string }
  const homeList: HomeTile[] = []
  for (const c of homeServices) {
    if (CLEANING.includes(c.slug)) {
      if (c.slug === cleaning[0]?.slug) homeList.push({ key: "cleaning", href: "/services/cleaning", image: c.image, icon: c.icon, name: pick(locale, "ক্লিনিং (বাসা ও রিসোর্ট)", "Cleaning (home & resort)"), price: pick(locale, "কথা বলে দাম ঠিক হয়", "Price agreed with you") })
      continue
    }
    homeList.push({ key: c.id, href: `/services/${c.slug}`, image: c.image, icon: c.icon, name: named(locale, c), price: categoryPriceLine(c, locale, taka, unitLabel) })
  }
  const videoIds = youtubeIds(settings.reviewVideos ?? "")
  const shots = (settings.reviewShots ?? "").split(",").map((f) => f.trim()).filter(Boolean).map((f) => `/api/uploads/${f}`)

  return (
    <div className="space-y-10 md:space-y-14">
      <JsonLd data={[organization(), localBusiness(shop, settings, areas), ...(faqs.length ? [faqLd(faqs.map((f) => ({ question: bn ? f.questionBn : f.question, answer: bn ? f.answerBn : f.answer })))] : [])]} />

      {/* Hero + search */}
      <section aria-labelledby="hero-title" className="navy-glow flex flex-col rounded-[1.6rem] px-4 py-5 shadow-[0_28px_70px_rgba(7,26,58,0.3)] ring-1 ring-cyan/20 md:rounded-[2rem] md:px-10 md:py-14 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-x-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden />
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/10 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="pill glass inline-flex items-center gap-1 text-[11px] text-white md:text-xs"><MapPin className="size-3.5" aria-hidden /> {coverageText(shop, locale)}</p>
          <h1 id="hero-title" className="display mt-3 max-w-2xl text-[1.4rem] font-extrabold leading-tight md:mt-4 md:text-[2.6rem]">
            {bn ? settings.heroBn : settings.heroEn}
          </h1>
          <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-white/80 md:mt-3 md:text-base">{bn ? settings.bannerBn : settings.bannerEn}</p>
          <div className="mt-4 md:mt-6"><SearchBox locale={locale} variant="hero" buttonText={t.search} /></div>
          <div className="mt-3 -mx-4 scroll-x px-4 md:mx-0 md:mt-5 md:flex-wrap md:px-0" aria-label={pick(locale, "জনপ্রিয় সেবা", "Popular services")}>
            {quick.map((c) => (
              <Link key={c.key} href={c.href} className="glass inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold text-white transition hover:bg-white hover:text-ink md:h-9 md:px-3.5 md:text-[13px]">
                {c.icon === "store" ? <Store className="size-3.5" aria-hidden /> : <CategoryIcon name={c.icon} className="size-3.5" />} {c.label}
              </Link>
            ))}
          </div>
        </div>
        {/* Featured-services board: rotating illustrated cards, one per category. On phones it is the first thing on screen, above the search. */}
        <div className="relative order-first mb-4 lg:order-none lg:row-span-2 lg:mb-0">
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
        <ul className="relative mt-4 grid max-w-xl grid-cols-3 gap-1.5 text-left md:mt-6 md:gap-2" aria-label={pick(locale, "আমাদের প্রতিশ্রুতি", "Our promises")}>
          {[
            [ShieldCheck, pick(locale, "যাচাই করা", "Verified"), pick(locale, "কর্মী ও পার্টনার", "team & partners")],
            [BadgeCheck, pick(locale, "দাম আগেই", "Price up front"), pick(locale, "লুকানো চার্জ নেই", "no hidden charges")],
            [Clock3, pick(locale, "দ্রুত সেবা", "Fast service"), pick(locale, "ক্যাশ / বিকাশ / নগদ", "cash / bKash / Nagad")],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof ShieldCheck
            return (
              <li key={title as string} className="glass flex items-center gap-2 rounded-xl px-2 py-1.5 md:block md:rounded-2xl md:px-3 md:py-2.5">
                <I className="size-3.5 shrink-0 text-cyan md:size-4" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-extrabold leading-tight md:mt-1.5 md:text-[13px]">{title as string}</span>
                  <span className="block truncate text-[10px] text-white/70 md:text-[11px]">{body as string}</span>
                </span>
              </li>
            )
          })}
        </ul>
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
          <MarketTiles locale={locale} shopId={shop.id} categories={categories} />
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
            {homeList.map((c) => (
              <Link key={c.key} href={c.href} className="card card-lift group flex flex-col overflow-hidden">
                {c.image ? (
                  <span className="relative block aspect-[5/3] w-full overflow-hidden bg-brand-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute top-2 left-2 grid size-8 place-items-center rounded-xl bg-white/90 text-brand shadow" aria-hidden>{c.key === "cleaning" ? <Sparkles className="size-4" /> : <CategoryIcon name={c.icon} className="size-4" />}</span>
                  </span>
                ) : null}
                <span className="flex flex-1 flex-col gap-1 p-3.5">
                  <span className="text-[15px] font-extrabold leading-snug text-ink">{c.name}</span>
                  <span className="mt-auto text-xs font-bold text-brand">{c.price}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Three promo panels */}
      <section aria-label={pick(locale, "বিশেষ অফার", "Highlights")} className="grid gap-3 md:grid-cols-3 md:gap-4">
        {rental ? (
          <Link href={`/services/${rental.slug}`} className="promo p-5 md:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/services/rent-a-car.jpg" alt="" loading="lazy" />
            <span className="promo-shade" aria-hidden />
            <Car className="pointer-events-none absolute -right-5 -bottom-5 size-32 text-cyan/15" aria-hidden />
            <p className="pill glass text-white">{named(locale, rental)}</p>
            <h2 className="display mt-3 text-xl font-extrabold leading-tight md:text-2xl">{pick(locale, "মেরিন ড্রাইভে চান্দের গাড়ি, কার বা বাইক", "Chander gari, car or bike for Marine Drive")}</h2>
            <p className="mt-2 text-sm text-white/85">{pick(locale, "ছবি ও রুট-প্যাকেজ দেখে বুক করুন। ড্রাইভারসহ অপশন আছে।", "See photos and route packages, then book. Driver options included.")}</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-sm font-extrabold ring-1 ring-white/20">{pick(locale, "গাড়ি দেখুন", "See vehicles")} <ArrowRight className="size-4 text-cyan" aria-hidden /></span>
          </Link>
        ) : null}
        {stay ? (
          <Link href={`/services/${stay.slug}`} className="promo p-5 md:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/services/resort-booking.jpg" alt="" loading="lazy" />
            <span className="promo-shade" aria-hidden />
            <Building2 className="pointer-events-none absolute -right-5 -bottom-5 size-32 text-cyan/15" aria-hidden />
            <p className="pill glass text-white">{named(locale, stay)}</p>
            <h2 className="display mt-3 text-xl font-extrabold leading-tight md:text-2xl">{pick(locale, "সৈকতের পাশে রিসোর্ট, হোটেল ও কটেজ", "Resorts, hotels and cottages by the beach")}</h2>
            <p className="mt-2 text-sm text-white/85">{pick(locale, "পার্টনার রিসোর্টের রুম ও রাতপ্রতি দাম এক জায়গায়। তারিখ দিন, বুক হয়ে যাবে।", "Partner resorts' rooms and nightly prices in one place. Pick dates and book.")}</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-sm font-extrabold ring-1 ring-white/20">{pick(locale, "রুম দেখুন", "See rooms")} <ArrowRight className="size-4 text-cyan" aria-hidden /></span>
          </Link>
        ) : null}
        {shutki ? (
          <Link href="/shop" className="promo p-5 md:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/services/achar.jpg" alt="" loading="lazy" />
            <span className="promo-shade" aria-hidden />
            <Fish className="pointer-events-none absolute -right-5 -bottom-5 size-32 text-cyan/15" aria-hidden />
            <p className="pill glass text-white">{pick(locale, "দোকান", "Shop")}</p>
            <h2 className="display mt-3 text-xl font-extrabold leading-tight md:text-2xl">{pick(locale, "শুঁটকি, আচার ও আরও, সারা দেশে ডেলিভারি", "Dried fish, pickles and more, delivered nationwide")}</h2>
            <p className="mt-2 text-sm text-white/85">{pick(locale, "সব পার্টনার দোকান এক জায়গায়; দোকান বেছে দেখুন কে কী বিক্রি করে, এক কার্টে নিন।", "Every partner store in one place; pick a store to see what it sells, one cart for all.")}</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-sm font-extrabold ring-1 ring-white/20">{pick(locale, "দোকানে যান", "Shop now")} <ArrowRight className="size-4 text-cyan" aria-hidden /></span>
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
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            [ShieldCheck, pick(locale, "যাচাই করা কর্মী", "Verified workers"), pick(locale, "প্রতিটা কর্মীর NID যাচাই করা, আমাদের নিজের টিম।", "Every worker is NID-checked and on our own team.")],
            [BadgeCheck, pick(locale, "নির্দিষ্ট দাম", "Fixed prices"), pick(locale, "দাম আগেই লেখা। লুকানো চার্জ নেই।", "Prices are listed up front. No hidden charges.")],
            [Clock3, pick(locale, "দ্রুত আসি", "We come fast"), pick(locale, "আজকেরটা আজই, বেশিরভাগ কাজ ২ ঘণ্টার স্লটে।", "Same-day for most jobs, in 2-hour slots.")],
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

      {/* Video reviews from our YouTube channel */}
      {videoIds.length ? (
        <section aria-labelledby="video-title">
          <p className="eyebrow">{pick(locale, "ভিডিও রিভিউ", "Video reviews")}</p>
          <h2 id="video-title" className="display mt-1 text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "কাস্টমাররা নিজেরাই বলছেন", "Customers in their own words")}</h2>
          <div className="mt-4"><VideoReviews ids={videoIds} locale={locale} /></div>
        </section>
      ) : null}

      {/* Screenshots of reviews from our Facebook page and YouTube */}
      {shots.length ? (
        <section aria-labelledby="shots-title">
          <p className="eyebrow">{pick(locale, "ফেসবুক ও ইউটিউব থেকে", "From Facebook & YouTube")}</p>
          <h2 id="shots-title" className="display mt-1 text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "আমাদের পেজে যা লিখেছেন", "What people wrote on our page")}</h2>
          <div className="mt-4"><ReviewShots photos={shots} label={pick(locale, "রিভিউ স্ক্রিনশট", "Review screenshot")} /></div>
        </section>
      ) : null}

      {/* Reviews */}
      {reviews.length ? (
        <section aria-labelledby="reviews-title">
          <p className="eyebrow">{pick(locale, "রিভিউ", "Reviews")}</p>
          <h2 id="reviews-title" className="display mt-1 text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "কাস্টমাররা যা বলেন", "What customers say")}</h2>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {reviews.map((r) => (
              <figure key={r.id} className="card card-lift flex w-72 shrink-0 flex-col p-5 md:w-auto">
                <blockquote className="text-[15px] text-ink">“{r.comment}”</blockquote>
                <figcaption className="mt-3 text-xs text-muted-foreground">
                  <span className="font-bold text-ink">{r.customer.name}</span> · {named(locale, r.booking.offering)} · {named(locale, r.booking.area)}
                </figcaption>
                <div className="mt-auto flex gap-0.5 pt-3 text-amber-400" aria-label={pick(locale, `${r.rating} তারা`, `${r.rating} stars`)} role="img">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="size-4 fill-current" aria-hidden />)}
                </div>
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
            <p className="mt-2 max-w-lg text-sm text-white/75 md:text-base">{pick(locale, "আপনি দাম ও স্টক ঠিক করেন; অর্ডার, চ্যাট আর পেমেন্ট আমরা সামলাই। ফ্রি সাইন-আপ, অফিস যাচাই করে চালু করে।", "You set prices and stock; we handle orders, chat and payment. Free to sign up; the office verifies and switches you on.")}</p>
          </div>
          <div className="grid gap-2">
            {[
              ["/partner", Car, pick(locale, "গাড়ি ভাড়া দিন", "Rent out your vehicle"), pick(locale, "বাইক, কার, চান্দের গাড়ি, বাস", "Bike, car, chander gari, bus")],
              ["/partner", Building2, pick(locale, "রিসোর্ট যুক্ত করুন", "List your resort"), pick(locale, "রুম ও রাতপ্রতি দাম আপনার হাতে", "Rooms and nightly prices, your call")],
              ["/partner", Fish, pick(locale, "দোকান খুলুন", "Open a store"), pick(locale, "শুঁটকি, আচার, লন্ড্রি: সারা দেশে অর্ডার", "Dried fish, pickles, laundry: orders nationwide")],
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
