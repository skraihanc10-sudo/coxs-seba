import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BadgeCheck, Car, Clock3, MapPin, MapPinned, MessageCircle, Phone, Search, ShieldCheck, Star } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { activeAreas, activeCategories, activeFaqs, categoryPriceLine, fromPrice, publishedReviews } from "@/lib/catalog"
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
  const areaCount = areas.length
  const firstArea = areas[0]
  const lastArea = areas[areas.length - 1]

  return (
    <div className="space-y-10 md:space-y-14">
      <JsonLd data={[organization(), localBusiness(shop, settings, areas), ...(faqs.length ? [faqLd(faqs.map((f) => ({ question: bn ? f.questionBn : f.question, answer: bn ? f.answerBn : f.answer })))] : [])]} />

      {/* Hero + search */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0b1f3a,#0a3fb0_60%,#1259e8)] px-5 py-8 text-white md:px-10 md:py-12 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
        <div className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative">
        <p className="pill inline-flex items-center gap-1 bg-white/15 text-white"><MapPin className="size-3.5" aria-hidden /> {coverageText(shop, locale)}</p>
        <h1 id="hero-title" className="display mt-4 max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl">
          {bn ? settings.heroBn : settings.heroEn}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-white/80 md:text-lg">{bn ? settings.bannerBn : settings.bannerEn}</p>
        <form action="/services" role="search" className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-1.5 shadow-xl">
          <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <input name="q" aria-label={pick(locale, "সেবা খুঁজুন", "Search services")} placeholder={pick(locale, "কী লাগবে? যেমন: চান্দের গাড়ি, রিসোর্ট, শুঁটকি, এসি", "What do you need? e.g. chander gari, resort, dried fish, AC")} className="h-11 min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted-foreground" />
          <button className="btn-primary h-11 px-4 text-sm">{t.search}</button>
        </form>
        <ul className="mt-5 flex flex-wrap gap-2 text-xs font-bold" aria-label={pick(locale, "আমাদের প্রতিশ্রুতি", "Our promises")}>
          <li className="rounded-full bg-white/15 px-3 py-1.5">✓ {pick(locale, "যাচাই করা কর্মী ও পার্টনার", "Verified workers & partners")}</li>
          <li className="rounded-full bg-white/15 px-3 py-1.5">✓ {pick(locale, "দাম আগেই জানুন", "Price up front")}</li>
          <li className="rounded-full bg-white/15 px-3 py-1.5">✓ {pick(locale, "ক্যাশ / বিকাশ / নগদ", "Cash / bKash / Nagad")}</li>
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

      {/* Service grid */}
      <section aria-labelledby="services-title">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="services-title" className="display text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "আমাদের সেবা", "Our services")}</h2>
          <Link href="/services" className="text-sm font-bold text-brand">{t.seeAll} →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => {
            return (
              <Link key={c.id} href={`/services/${c.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:ring-brand/40">
                {c.image ? (
                  <span className="relative block aspect-[5/3] w-full overflow-hidden bg-brand-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </span>
                ) : null}
                <span className="flex flex-1 flex-col gap-2 p-3.5">
                  <span className="flex items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white" aria-hidden>
                      <CategoryIcon name={c.icon} className="size-4" />
                    </span>
                    <span className="text-[15px] font-extrabold leading-snug text-ink">{named(locale, c)}</span>
                  </span>
                  <span className="mt-auto text-xs text-muted-foreground">
                    {categoryPriceLine(c, locale, taka, unitLabel)}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Rent-a-car promo */}
      {rental ? (
        <section aria-labelledby="rental-title" className="relative overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#0f766e,#14b8a6)] p-5 text-white md:p-8">
          <Car className="pointer-events-none absolute -right-6 -bottom-6 size-40 text-white/10" aria-hidden />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="pill bg-white/15 text-white">{named(locale, rental)}</p>
              <h2 id="rental-title" className="display mt-3 max-w-xl text-2xl font-extrabold leading-tight md:text-3xl">
                {pick(locale, "মেরিন ড্রাইভ ঘুরতে ছাদখোলা জিপ, কার বা বাইক", "Open-roof jeep, car or bike for Marine Drive")}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/85 md:text-base">{bn ? rental.blurbBn : rental.blurb}</p>
              {fromPrice(rental.offerings) ? (
                <p className="mt-2 text-sm font-bold">{t.from} {taka(fromPrice(rental.offerings) ?? 0, locale)} · {pick(locale, "ড্রাইভারসহ অপশন আছে", "Driver included options")}</p>
              ) : null}
            </div>
            <Link href={`/services/${rental.slug}`} className="btn-primary shrink-0 bg-white text-teal-800 hover:bg-white/90">
              {pick(locale, "গাড়ি ও বাইক দেখুন", "See cars & bikes")} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      ) : null}

      {/* How it works */}
      <section aria-labelledby="how-title" className="card p-5 md:p-8">
        <h2 id="how-title" className="display text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "কীভাবে কাজ করে", "How it works")}</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            [pick(locale, "সেবা বেছে নিন", "Pick a service"), pick(locale, "সেবা আর অপশন বাছুন, আনুমানিক দাম সাথে সাথে দেখুন।", "Choose the service and options and see the estimate right away.")],
            [pick(locale, "ঠিকানা আর সময় দিন", "Add address & time"), pick(locale, `${shop.cityBn} এলাকা, বাড়ির ঠিকানা আর পছন্দের সময় দিন। মোবাইল নম্বর দিলেই হবে।`, `Your ${shop.city} area, address and a time slot. A mobile number is all you need.`)],
            [pick(locale, "কর্মী আসবেন", "The worker arrives"), pick(locale, "আমাদের যাচাই করা কর্মী সময়মতো আসবেন। কাজ শেষে ক্যাশ, বিকাশ বা নগদে দিন।", "Our verified worker comes on time. Pay cash, bKash or Nagad when it's done.")],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-base font-extrabold text-white" aria-hidden>{i + 1}</span>
              <div>
                <p className="font-extrabold text-ink">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/how-it-works" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-brand">
          {pick(locale, "বিস্তারিত দেখুন", "Read more")} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      {/* Why us */}
      <section aria-labelledby="why-title">
        <h2 id="why-title" className="display text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "কেন HANDYO", "Why HANDYO")}</h2>
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
              <div key={title as string} className="card p-5">
                <I className="size-6 text-brand" aria-hidden />
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
          <div className="mb-4 flex items-end justify-between">
            <h2 id="where-title" className="display text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "আমরা যেখানে আছি", "Where we are")}</h2>
            <Link href="/branches" className="text-sm font-bold text-brand">{pick(locale, "সব শাখা", "All branches")} →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => (
              <Link key={s.id} href={`/branches/${s.slug}`} className={`card flex items-start gap-3 p-4 transition hover:ring-brand/40 ${s.id === shop.id ? "ring-brand/50" : ""}`}>
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
          <h2 id="reviews-title" className="display text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "কাস্টমাররা যা বলেন", "What customers say")}</h2>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {reviews.map((r) => (
              <figure key={r.id} className="card w-72 shrink-0 p-5 md:w-auto">
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

      {/* Helpline */}
      <section aria-label={pick(locale, "হেল্পলাইন", "Helpline")} className="card flex flex-col gap-4 bg-brand-soft p-5 ring-0 md:flex-row md:items-center md:justify-between md:p-8">
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
        <h2 id="faq-title" className="display text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "সাধারণ প্রশ্ন", "Common questions")}</h2>
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
