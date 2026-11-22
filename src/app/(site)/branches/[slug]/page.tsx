import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { activeAreas, activeCategories, fromPrice } from "@/lib/catalog"
import { coverageText, currentShop, shopBySlug } from "@/lib/shops"
import { setShopAction } from "@/actions/auth"
import { named, pick, words } from "@/lib/i18n"
import { taka, telHref, whatsappHref } from "@/lib/format"
import { unitLabel } from "@/lib/pricing"
import { clip, pageMeta } from "@/lib/seo"
import { ofBn } from "@/lib/bangla"
import { CategoryIcon } from "@/components/category-icon"
import { breadcrumbs, JsonLd, localBusiness } from "@/components/seo/json-ld"

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()])
  const shop = await shopBySlug(slug)
  if (!shop) return { title: pick(locale, "শাখা পাওয়া যায়নি", "Branch not found"), robots: { index: false, follow: false } }
  return pageMeta({
    locale,
    title: pick(locale, `${shop.nameBn} · ${shop.cityBn} এলাকায় ঘরের সেবা`, `${shop.name} · Home services in ${shop.city}`),
    description: clip(
      (locale === "bn" ? shop.blurbBn : shop.blurb) ||
        pick(locale, `${shop.cityBn} এলাকায় লন্ড্রি, ইলেকট্রিশিয়ান, প্লাম্বার, ক্লিনিং আর আরও অনেক কিছু, আমাদের নিজের টিম দিয়ে।`, `Laundry, electricians, plumbers, cleaning and more in ${shop.city}, done by our own team.`),
    ),
    path: `/branches/${shop.slug}`,
  })
}

export default async function BranchPage({ params }: { params: Params }) {
  const [{ slug }, locale, current] = await Promise.all([params, getLocale(), currentShop()])
  const shop = await shopBySlug(slug)
  if (!shop) notFound()
  const [settings, areas, categories] = await Promise.all([getSettings(shop.id), activeAreas(shop.id), activeCategories(shop.id)])
  const t = words(locale)
  const bn = locale === "bn"
  const viewing = shop.id === current.id
  const helpline = shop.phone || settings.helpline
  const whatsapp = shop.whatsapp || settings.whatsapp
  const email = shop.email || settings.supportEmail
  const address = bn ? shop.addressBn || settings.address : shop.address || settings.addressEn

  return (
    <div className="space-y-8 md:space-y-10">
      <JsonLd data={[localBusiness(shop, settings, areas), breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "আমাদের শাখা", "Our branches"), path: "/branches" }, { name: bn ? shop.nameBn : shop.name, path: `/branches/${shop.slug}` }])]} />

      {/* Hero */}
      <section aria-labelledby="branch-title" className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0b1f3a,#0a3fb0_60%,#1259e8)] px-5 py-9 text-white md:px-10 md:py-12">
        <div className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <Link href="/branches" className="text-xs font-bold text-white/70 hover:text-white">← {pick(locale, "সব শাখা", "All branches")}</Link>
        <p className="pill mt-3 inline-flex items-center gap-1 bg-white/15 text-white"><MapPin className="size-3.5" aria-hidden /> {coverageText(shop, locale)}{shop.kind === "PARTNER" ? ` · ${pick(locale, "পার্টনার", "Partner")}` : ""}</p>
        <h1 id="branch-title" className="display mt-3 text-3xl font-extrabold leading-tight md:text-5xl">{bn ? shop.cityBn : shop.city}</h1>
        <p className="mt-1 text-lg font-bold text-white/90">{bn ? shop.nameBn : shop.name}</p>
        {(bn ? shop.blurbBn : shop.blurb) ? <p className="mt-3 max-w-xl text-[15px] text-white/80 md:text-lg">{bn ? shop.blurbBn : shop.blurb}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2">
          {viewing ? (
            <Link href="/services" className="btn-primary bg-white text-brand hover:bg-white/90">{pick(locale, "সেবা দেখুন", "See services")} <ArrowRight className="size-4" aria-hidden /></Link>
          ) : (
            <form action={setShopAction}>
              <input type="hidden" name="shop" value={shop.slug} />
              <input type="hidden" name="back" value="/services" />
              <button className="btn-primary bg-white text-brand hover:bg-white/90">{pick(locale, "এই শাখায় বুক করুন", "Book with this branch")} <ArrowRight className="size-4" aria-hidden /></button>
            </form>
          )}
          <a href={telHref(helpline)} className="btn-ghost bg-white/10 text-white ring-white/20 hover:bg-white/20"><Phone className="size-4" aria-hidden /> {helpline}</a>
        </div>
      </section>

      {/* Areas */}
      <section aria-labelledby="areas-title">
        <h2 id="areas-title" className="display text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, "যেসব এলাকায় যাই", "Areas we serve")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{pick(locale, `${ofBn(shop.cityBn)} ${areas.length}টা এলাকা। কোনো এলাকায় ভিজিট চার্জ থাকলে সাথে লেখা।`, `${areas.length} areas in ${shop.city}. Visit charges, where any, are shown.`)}</p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label={pick(locale, "এলাকার তালিকা", "Area list")}>
          {areas.map((a) => (
            <li key={a.id} className="chip">
              {named(locale, a)}{a.charge ? <span className="ml-1 text-xs text-muted-foreground">+{taka(a.charge, locale)}</span> : null}
            </li>
          ))}
          {!areas.length ? <li className="text-sm text-muted-foreground">{t.empty}</li> : null}
        </ul>
      </section>

      {/* Services */}
      <section aria-labelledby="branch-services-title">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="branch-services-title" className="display text-2xl font-extrabold text-ink md:text-3xl">{pick(locale, `${shop.cityBn} এলাকায় সেবা`, `Services in ${shop.city}`)}</h2>
          {viewing ? <Link href="/services" className="text-sm font-bold text-brand">{t.seeAll} →</Link> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => {
            const from = fromPrice(c.offerings)
            const cheapest = c.offerings.find((o) => o.price === from)
            const card = (
              <>
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white" aria-hidden>
                  <CategoryIcon name={c.icon} />
                </span>
                <span className="text-[15px] font-extrabold leading-snug text-ink">{named(locale, c)}</span>
                <span className="mt-auto text-xs text-muted-foreground">
                  {from && cheapest ? `${t.from} ${taka(from, locale)}/${unitLabel(cheapest.pricing, locale)}` : pick(locale, "দেখে দাম", "Quote after visit")}
                </span>
              </>
            )
            return viewing ? (
              <Link key={c.id} href={`/services/${c.slug}`} className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:ring-brand/40">{card}</Link>
            ) : (
              <form key={c.id} action={setShopAction} className="contents">
                <input type="hidden" name="shop" value={shop.slug} />
                <input type="hidden" name="back" value={`/services/${c.slug}`} />
                <button className="card group flex flex-col gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:ring-brand/40">{card}</button>
              </form>
            )
          })}
          {!categories.length ? <p className="col-span-full text-sm text-muted-foreground">{t.empty}</p> : null}
        </div>
      </section>

      {/* Contact card + CTA */}
      <section aria-labelledby="contact-title" className="card grid gap-6 p-5 md:grid-cols-2 md:p-8">
        <div>
          <h2 id="contact-title" className="display text-2xl font-extrabold text-ink">{pick(locale, "যোগাযোগ", "Contact")}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /><address className="not-italic text-ink">{address}</address></li>
            <li className="flex items-start gap-3"><Clock3 className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /><span className="text-ink">{bn ? settings.officeHours : settings.officeHoursEn}</span></li>
            <li className="flex items-start gap-3"><Phone className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /><a href={telHref(helpline)} className="font-bold text-ink">{helpline}</a></li>
            {whatsapp ? <li className="flex items-start gap-3"><MessageCircle className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /><a href={whatsappHref(whatsapp)} className="font-bold text-ink">{whatsapp}</a></li> : null}
            {email ? <li className="flex items-start gap-3"><Mail className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /><a href={`mailto:${email}`} className="font-bold text-ink">{email}</a></li> : null}
          </ul>
        </div>
        <div className="flex flex-col justify-center gap-3 rounded-2xl bg-brand-soft p-5">
          <p className="display text-xl font-extrabold text-ink">{pick(locale, `${shop.cityBn} এলাকায় কাজ লাগবে?`, `Need something done in ${shop.city}?`)}</p>
          <p className="text-sm text-muted-foreground">{pick(locale, "দাম আগেই লেখা, যাচাই করা নিজের টিম, কাজ শেষে ক্যাশ, বিকাশ বা নগদ।", "Prices up front, our own verified team, pay cash, bKash or Nagad when it's done.")}</p>
          {viewing ? (
            <Link href="/services" className="btn-primary">{t.bookNow} <ArrowRight className="size-4" aria-hidden /></Link>
          ) : (
            <form action={setShopAction}>
              <input type="hidden" name="shop" value={shop.slug} />
              <input type="hidden" name="back" value="/services" />
              <button className="btn-primary w-full">{pick(locale, "এই শাখায় বুক করুন", "Book with this branch")} <ArrowRight className="size-4" aria-hidden /></button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
