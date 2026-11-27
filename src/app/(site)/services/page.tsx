import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { activeCategories, categoryPriceLine, CLEANING_SLUGS } from "@/lib/catalog"
import { currentShop } from "@/lib/shops"
import { named, pick, words } from "@/lib/i18n"
import { taka } from "@/lib/format"
import { unitLabel } from "@/lib/pricing"
import { pageMeta } from "@/lib/seo"
import { ofBn } from "@/lib/bangla"
import { CategoryIcon } from "@/components/category-icon"
import { PageHeader, EmptyState } from "@/components/bits"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"
import { SearchBox } from "@/components/search-box"
import { SearchResults } from "@/components/search-results"
import { search, suggestions } from "@/lib/search"

export async function generateMetadata(): Promise<Metadata> {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  return pageMeta({
    locale,
    title: pick(locale, `সব সেবা ও দাম · ${shop.cityBn}`, `All services & prices · ${shop.city}`),
    description: pick(
      locale,
      `${ofBn(shop.cityBn)} যেকোনো এলাকায় ঘরের সেবা, গাড়ি-বাইক-চান্দের গাড়ি ভাড়া, রিসোর্ট বুকিং আর শুঁটকি-আচারের দোকান: দাম আগেই লেখা, যাচাই করা টিম ও পার্টনার।`,
      `Home services, car & bike rental, resort booking and dried-fish & pickle stores anywhere in ${shop.city}: prices up front, verified team and partners.`,
    ),
    path: "/services",
  })
}

/** Marketplace categories list real things (vehicles, rooms, products) on their own page, not price rows here. */
const MARKET: Record<string, { bn: string; en: string }> = {
  RENTAL: { bn: "গাড়ি, বাইক, চান্দের গাড়ি ও বাস – ছবি ও ভাড়া দেখে বুক করুন", en: "Cars, bikes, chander gari and buses: see photos and rates, then book" },
  STAY: { bn: "রিসোর্ট, হোটেল ও কটেজ – রুম ও রাতপ্রতি দাম দেখে বুক করুন", en: "Resorts, hotels and cottages: see rooms and nightly prices, then book" },
  SHOP: { bn: "পার্টনার দোকানের পণ্য – কার্টে নিয়ে সারা দেশে ডেলিভারি", en: "Partner stores' products: add to cart, delivered nationwide" },
}

/** The services list shows one door per group, like the home page: every SHOP-flow category is one shop, and home + resort cleaning is one cleaning door. */
type Cat = Awaited<ReturnType<typeof activeCategories>>[number]
type Door = Cat & { href?: string; priceOverride?: { bn: string; en: string }; pills?: boolean }
function mergeDoors(categories: Cat[]): Door[] {
  const out: Door[] = []
  let shopDone = false
  let cleaningDone = false
  for (const c of categories) {
    if (c.flow === "SHOP") {
      if (shopDone) continue
      shopDone = true
      out.push({ ...c, slug: "shop", icon: "store", name: "Shop: dried fish, pickles and more", nameBn: "দোকান: শুঁটকি, আচার ও আরও", blurb: "Every partner store in one place: dried fish, pickles, chutney and more. Pick a store to see what it sells; courier nationwide.", blurbBn: "সব পার্টনার দোকান এক জায়গায়: শুঁটকি, আচার, চাটনি ও আরও। দোকান বেছে দেখুন কে কী বিক্রি করে; সারা দেশে কুরিয়ার।", href: "/shop" })
      continue
    }
    if (CLEANING_SLUGS.includes(c.slug)) {
      if (cleaningDone) continue
      cleaningDone = true
      out.push({ ...c, slug: "cleaning", name: "Cleaning: home and resort/hotel", nameBn: "ক্লিনিং: বাসা ও রিসোর্ট-হোটেল", blurb: "Home deep cleans, kitchen and bathroom; full crews for resorts and hotels. We look at the job and agree the price with you.", blurbBn: "বাসার ডিপ ক্লিন, কিচেন-বাথরুম; রিসোর্ট-হোটেলের জন্য পুরো টিম। কাজ দেখে কথা বলে দাম ঠিক হয়।", href: "/services/cleaning", priceOverride: { bn: "কথা বলে দাম ঠিক হয়", en: "Price agreed after a look" }, pills: false })
      continue
    }
    out.push(c)
  }
  return out
}

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }, locale, shop] = await Promise.all([searchParams, getLocale(), currentShop()])
  const categories = await activeCategories(shop.id)
  const t = words(locale)
  const bn = locale === "bn"
  const needle = q.trim()
  const hits = needle ? await search(shop.id, needle, 40) : []
  const soft = needle && !hits.length ? await suggestions(shop.id, 8) : []
  const list = needle ? [] : mergeDoors(categories)
  return (
    <div>
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "সব সেবা", "All services"), path: "/services" }])} />
      <PageHeader title={pick(locale, "সব সেবা", "All services")} sub={pick(locale, `${ofBn(shop.cityBn)} যেকোনো এলাকায় – যাচাই করা টিম ও পার্টনার, দাম আগেই লেখা।`, `Anywhere in ${shop.city}: verified team and partners, prices up front.`)} />
      <div className="mb-5"><SearchBox locale={locale} initial={q} buttonText={t.search} /></div>
      {needle && hits.length ? (
        <SearchResults locale={locale} q={needle} hits={hits} />
      ) : needle ? (
        <div className="space-y-5">
          <EmptyState
            title={pick(locale, `“${needle}” এর মতো কিছু পাইনি`, `Nothing close to “${needle}”`)}
            body={pick(locale, "বানান একটু অন্যরকম লিখে দেখুন, বা নিচের থেকে বেছে নিন। তালিকায় নেই এমন কাজ হলে “অন্যান্য” সেবায় লিখুন, আমরা কল দিয়ে দাম জানাব।", "Try another spelling or pick from the list below. Not on the list? Use “Something else” and describe it; we'll call with a price.")}
            href="/services/other"
            action={pick(locale, "আপনার কাজটা লিখুন", "Describe your job")}
          />
          <SearchResults locale={locale} q={needle} hits={soft} soft />
        </div>
      ) : !list.length ? (
        <EmptyState
          title={pick(locale, "কিছু পাওয়া যায়নি", "Nothing matched")}
          body={pick(locale, "তালিকায় নেই এমন কাজ? “অন্যান্য” সেবায় নিজের ভাষায় লিখুন, আমরা কল দিয়ে দাম জানাব।", "Not on the list? Use “Something else” and describe it; we'll call with a price.")}
          href="/services/other"
          action={pick(locale, "আপনার কাজটা লিখুন", "Describe your job")}
        />
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const market = MARKET[c.flow]
            const priceLine = c.priceOverride ? (bn ? c.priceOverride.bn : c.priceOverride.en) : categoryPriceLine(c, locale, taka, unitLabel)
            const href = c.href ?? `/services/${c.slug}`
            const pills = c.pills === false ? [] : c.offerings.filter((o) => o.slug !== "by-item")
            return (
              <article key={c.id} className="card card-lift group relative flex gap-3 overflow-hidden p-3 md:gap-5 md:p-4" aria-labelledby={`cat-${c.slug}`}>
                <span className="relative block w-32 shrink-0 self-start overflow-hidden rounded-xl bg-brand-soft sm:w-44 md:w-56">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt="" loading="lazy" className="aspect-[5/3] w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="grid aspect-[5/3] w-full place-items-center text-brand" aria-hidden><CategoryIcon name={c.icon} className="size-8" /></span>
                  )}
                </span>
                <div className="relative min-w-0 flex-1 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 id={`cat-${c.slug}`} className="display flex items-center gap-2 text-base font-extrabold leading-tight text-ink md:text-lg">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand" aria-hidden><CategoryIcon name={c.icon} className="size-4" /></span>
                        <span className="truncate">{named(locale, c)}</span>
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{bn ? c.blurbBn : c.blurb}</p>
                    </div>
                    <ChevronRight className="mt-1 hidden size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand sm:block" aria-hidden />
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-brand">{priceLine}</p>
                  {market ? (
                    <p className="mt-1 text-xs text-muted-foreground">{bn ? market.bn : market.en}</p>
                  ) : pills.length ? (
                    <ul className="relative z-20 mt-2 flex flex-wrap gap-1.5">
                      {pills.slice(0, 3).map((o) => (
                        <li key={o.id} className="max-w-full">
                          <Link href={`/book/${c.slug}/${o.slug}`} className="inline-flex max-w-full flex-wrap items-center gap-x-1 rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-ink ring-1 ring-transparent transition hover:ring-brand/40">
                            <span>{named(locale, o)}</span>
                            <span className="font-semibold whitespace-nowrap text-muted-foreground">{o.pricing === "QUOTE" ? pick(locale, "· দেখে দাম", "· quote") : `· ${taka(o.price, locale)}/${unitLabel(o.pricing, locale)}`}</span>
                          </Link>
                        </li>
                      ))}
                      {pills.length > 3 ? (
                        <li>
                          <Link href={href} className="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand">
                            {pick(locale, `+ আরও ${pills.length - 3}টা · সব দেখুন`, `+ ${pills.length - 3} more · see all`)}
                          </Link>
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
                {/* Last in the DOM and above everything but the offering chips: the whole card opens the category. */}
                <Link href={href} className="absolute inset-0 z-10 rounded-[inherit]" aria-label={named(locale, c)} />
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
