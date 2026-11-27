import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, MessageCircle, Phone } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { currentShop } from "@/lib/shops"
import { activeCategories, CLEANING_SLUGS } from "@/lib/catalog"
import { getSettings } from "@/lib/settings"
import { named, pick } from "@/lib/i18n"
import { telHref, whatsappHref } from "@/lib/format"
import { pageMeta } from "@/lib/seo"
import { PageHeader, TrustStrip } from "@/components/bits"
import { CategoryIcon } from "@/components/category-icon"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"


export async function generateMetadata(): Promise<Metadata> {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  return pageMeta({
    locale,
    title: pick(locale, `ক্লিনিং সার্ভিস ${shop.cityBn} · বাসা ও রিসোর্ট-হোটেল`, `Cleaning service ${shop.city} · home and resort/hotel`),
    description: pick(locale, "বাসার ডিপ ক্লিন, কিচেন-বাথরুম, সোফা-কার্পেট; আর রিসোর্ট-হোটেলের জন্য পুরো টিম। কাজ দেখে কথা বলে দাম ঠিক হয়।", "Home deep cleans, kitchen and bathroom, sofa and carpet; and full crews for resorts and hotels. We look at the job and agree the price with you."),
    path: "/services/cleaning",
  })
}

/** One door for both cleaning teams: pick home or resort, then book inside. No list price here; it is agreed after a look. */
export default async function CleaningPage() {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  const [categories, settings] = await Promise.all([activeCategories(shop.id), getSettings(shop.id)])
  const bn = locale === "bn"
  const cats = CLEANING_SLUGS.map((s) => categories.find((c) => c.slug === s)).filter((c): c is NonNullable<typeof c> => Boolean(c))
  return (
    <div className="mx-auto max-w-4xl">
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "ক্লিনিং", "Cleaning"), path: "/services/cleaning" }])} />
      <PageHeader back="/" title={pick(locale, "ক্লিনিং সার্ভিস", "Cleaning service")} sub={pick(locale, "বাসা না রিসোর্ট-হোটেল, বেছে নিন। কাজ দেখে কথা বলে দাম ঠিক হয়; লুকানো চার্জ নেই।", "Home or resort/hotel, pick one. We look at the job and agree the price with you; no hidden charges.")} />
      <div className="grid gap-4 sm:grid-cols-2">
        {cats.map((c) => (
          <Link key={c.id} href={`/services/${c.slug}`} className="card card-lift group flex flex-col overflow-hidden">
            {c.image ? (
              <span className="relative block aspect-[16/10] w-full overflow-hidden bg-brand-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute top-3 left-3 grid size-10 place-items-center rounded-xl bg-white/90 text-brand shadow" aria-hidden><CategoryIcon name={c.icon} className="size-5" /></span>
              </span>
            ) : null}
            <span className="flex flex-1 flex-col gap-1.5 p-4">
              <span className="display text-lg font-extrabold text-ink">{named(locale, c)}</span>
              <span className="text-sm text-muted-foreground">{bn ? c.blurbBn : c.blurb}</span>
              <span className="mt-1 flex flex-wrap gap-1.5">
                {c.offerings.slice(0, 4).map((o) => <span key={o.id} className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-bold text-ink">{named(locale, o)}</span>)}
              </span>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-extrabold text-brand">{pick(locale, "কথা বলে দাম ঠিক হয় · ভিতরে দেখুন", "Price agreed after a look · see inside")} <ArrowRight className="size-4" aria-hidden /></span>
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <a href={telHref(settings.helpline)} className="btn-primary h-11 px-5 text-sm"><Phone className="size-4" aria-hidden /> {pick(locale, "কল করে দাম জানুন", "Call for a price")}</a>
        <a href={whatsappHref(settings.whatsapp, pick(locale, "ক্লিনিং সার্ভিসের দাম জানতে চাই", "I want a cleaning price"))} className="btn-soft h-11 px-5 text-sm"><MessageCircle className="size-4" aria-hidden /> WhatsApp</a>
      </div>
      <div className="mt-6"><TrustStrip locale={locale} /></div>
    </div>
  )
}
