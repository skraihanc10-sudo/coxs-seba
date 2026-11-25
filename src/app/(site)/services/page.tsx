import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, Search } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { activeCategories, categoryPriceLine } from "@/lib/catalog"
import { currentShop } from "@/lib/shops"
import { named, pick, words } from "@/lib/i18n"
import { taka } from "@/lib/format"
import { unitLabel } from "@/lib/pricing"
import { pageMeta } from "@/lib/seo"
import { ofBn } from "@/lib/bangla"
import { CategoryIcon } from "@/components/category-icon"
import { PageHeader, EmptyState } from "@/components/bits"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"

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

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }, locale, shop] = await Promise.all([searchParams, getLocale(), currentShop()])
  const categories = await activeCategories(shop.id)
  const t = words(locale)
  const bn = locale === "bn"
  const needle = q.trim().toLowerCase()
  const hit = (s: string) => s.toLowerCase().includes(needle)
  const list = needle
    ? categories
        .map((c) => ({
          ...c,
          offerings: hit(c.name) || hit(c.nameBn) || hit(c.blurb) || hit(c.blurbBn) ? c.offerings : c.offerings.filter((o) => hit(o.name) || hit(o.nameBn) || hit(o.detail) || hit(o.detailBn)),
        }))
        .filter((c) => c.offerings.length || hit(c.name) || hit(c.nameBn))
    : categories

  return (
    <div>
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "সব সেবা", "All services"), path: "/services" }])} />
      <PageHeader title={pick(locale, "সব সেবা", "All services")} sub={pick(locale, `${ofBn(shop.cityBn)} যেকোনো এলাকায় – যাচাই করা টিম ও পার্টনার, দাম আগেই লেখা।`, `Anywhere in ${shop.city}: verified team and partners, prices up front.`)} />
      <form role="search" className="mb-5 flex items-center gap-2 rounded-2xl bg-paper p-1.5 ring-1 ring-line">
        <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <input name="q" defaultValue={q} aria-label={pick(locale, "সেবা খুঁজুন", "Search services")} placeholder={pick(locale, "কী লাগবে? যেমন: চান্দের গাড়ি, রিসোর্ট, শুঁটকি, এসি", "What do you need? e.g. chander gari, resort, dried fish, AC")} className="h-11 min-w-0 flex-1 bg-transparent outline-none" />
        <button className="btn-soft h-11 px-4 text-sm">{t.search}</button>
      </form>
      {!list.length ? (
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
            const priceLine = categoryPriceLine(c, locale, taka, unitLabel)
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
                  ) : (
                    <ul className="relative z-20 mt-2 flex flex-wrap gap-1.5">
                      {c.offerings.map((o) => (
                        <li key={o.id}>
                          <Link href={`/book/${c.slug}/${o.slug}`} className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-ink ring-1 ring-transparent transition hover:ring-brand/40">
                            {named(locale, o)}
                            <span className="font-semibold text-muted-foreground">{o.pricing === "QUOTE" ? pick(locale, "· দেখে দাম", "· quote") : `· ${taka(o.price, locale)}/${unitLabel(o.pricing, locale)}`}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Last in the DOM and above everything but the offering chips: the whole card opens the category. */}
                <Link href={`/services/${c.slug}`} className="absolute inset-0 z-10 rounded-[inherit]" aria-label={named(locale, c)} />
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
