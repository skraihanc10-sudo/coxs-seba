import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, MapPin, MessageCircle, Phone } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { activeShops, currentShop } from "@/lib/shops"
import { setShopAction } from "@/actions/auth"
import { pick } from "@/lib/i18n"
import { telHref, whatsappHref } from "@/lib/format"
import { pageMeta } from "@/lib/seo"
import { PageHeader, EmptyState } from "@/components/bits"
import { breadcrumbs, JsonLd, localBusiness } from "@/components/seo/json-ld"

export async function generateMetadata(): Promise<Metadata> {
  const [locale, shops] = await Promise.all([getLocale(), activeShops()])
  const cities = shops.map((s) => (locale === "bn" ? s.cityBn : s.city)).join(", ")
  return pageMeta({
    locale,
    title: pick(locale, "আমাদের শাখা", "Our branches"),
    description: pick(locale, `HANDYO যেখানে আছে: ${cities}। আপনার শহর বেছে নিন, সেই শাখার সেবা, দাম আর এলাকা দেখুন।`, `Where HANDYO is: ${cities}. Pick your city to see that branch's services, prices and areas.`),
    path: "/branches",
  })
}

export default async function BranchesPage() {
  const [locale, shops, current] = await Promise.all([getLocale(), activeShops(), currentShop()])
  const bn = locale === "bn"
  return (
    <div className="mx-auto max-w-3xl">
      <JsonLd data={[breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "আমাদের শাখা", "Our branches"), path: "/branches" }]), ...shops.map((s) => localBusiness(s))]} />
      <PageHeader back="/" title={pick(locale, "আমাদের শাখা", "Our branches")} sub={pick(locale, "যে শহরে আছেন, সেই শাখা বেছে নিন। সেবা, দাম আর এলাকা শাখা অনুযায়ী আলাদা।", "Pick the branch in your city. Services, prices and areas differ by branch.")} />
      {!shops.length ? (
        <EmptyState title={pick(locale, "এখনো কোনো শাখা চালু নেই", "No branch is open yet")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shops.map((s) => {
            const active = s.id === current.id
            return (
              <article key={s.id} className={`card flex flex-col gap-3 p-5 ${active ? "ring-brand/50" : ""}`} aria-labelledby={`shop-${s.slug}`}>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden><MapPin className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <h2 id={`shop-${s.slug}`} className="display text-xl font-extrabold text-ink">{bn ? s.nameBn : s.name}</h2>
                    <p className="text-sm font-bold text-brand">{bn ? s.cityBn : s.city}{active ? ` · ${pick(locale, "এখন দেখছেন", "viewing now")}` : ""}</p>
                  </div>
                  {s.kind === "PARTNER" ? <span className="pill bg-canvas text-ink">{pick(locale, "পার্টনার", "Partner")}</span> : null}
                </div>
                {(bn ? s.blurbBn : s.blurb) ? <p className="text-sm text-muted-foreground">{bn ? s.blurbBn : s.blurb}</p> : null}
                {(bn ? s.addressBn : s.address) ? <address className="text-xs not-italic text-muted-foreground">{bn ? s.addressBn : s.address}</address> : null}
                <div className="flex flex-wrap gap-2 text-sm">
                  {s.phone ? <a href={telHref(s.phone)} className="btn-soft h-10 px-3"><Phone className="size-4" aria-hidden /> {s.phone}</a> : null}
                  {s.whatsapp ? <a href={whatsappHref(s.whatsapp)} className="btn-ghost h-10 px-3"><MessageCircle className="size-4" aria-hidden /> {pick(locale, "হোয়াটসঅ্যাপ", "WhatsApp")}</a> : null}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  <form action={setShopAction}>
                    <input type="hidden" name="shop" value={s.slug} />
                    <input type="hidden" name="back" value="/services" />
                    <button className="btn-primary h-11 px-5">{pick(locale, "এই শাখায় বুক করুন", "Book with this branch")} <ArrowRight className="size-4" aria-hidden /></button>
                  </form>
                  <Link href={`/branches/${s.slug}`} className="text-sm font-bold text-brand">{pick(locale, "বিস্তারিত", "Details")} →</Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
