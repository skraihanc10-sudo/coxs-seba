import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BedDouble, Clock3, MapPin, Star, Users } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { currentShop } from "@/lib/shops"
import { named, pick } from "@/lib/i18n"
import { taka } from "@/lib/format"
import { photoUrl, photosOf } from "@/lib/vehicles"
import { kindText, listOf, liveProperty, propertyName } from "@/lib/stays"
import { clip, pageMeta } from "@/lib/seo"
import { PageHeader } from "@/components/bits"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ id }, locale] = await Promise.all([params, getLocale()])
  const p = await liveProperty(id)
  if (!p) return { title: pick(locale, "রিসোর্ট পাওয়া যায়নি", "Property not found"), robots: { index: false, follow: false } }
  const city = locale === "bn" ? p.shop.cityBn : p.shop.city
  const from = p.rooms.filter((r) => r.active).map((r) => r.pricePerNight).sort((a, b) => a - b)[0]
  return pageMeta({
    locale,
    title: `${propertyName(p, locale)} · ${kindText(p.kind, locale)} · ${named(locale, p.area)}, ${city}${from ? pick(locale, ` · ${taka(from, locale)}/রাত থেকে`, ` · from ${taka(from, locale)}/night`) : ""}`,
    description: clip(`${locale === "bn" ? p.detailBn || p.detail : p.detail || p.detailBn} ${pick(locale, `${p.rooms.length} ধরনের রুম, অনলাইনে বুক করুন।`, `${p.rooms.length} room types, book online.`)}`),
    path: `/stays/${p.id}`,
  })
}

/** One property's page: gallery, about, amenities, policy, and the room types with nightly prices. */
export default async function StayPage({ params }: { params: Params }) {
  const [{ id }, locale, shop] = await Promise.all([params, getLocale(), currentShop()])
  const p = await liveProperty(id)
  if (!p) notFound()
  const bn = locale === "bn"
  const name = propertyName(p, locale)
  const photos = photosOf(p)
  const cover = photos[0] ? photoUrl(photos[0]) : null
  const detail = bn ? p.detailBn || p.detail : p.detail || p.detailBn
  const policy = bn ? p.policyBn || p.policy : p.policy || p.policyBn
  const owner = p.worker?.kind === "PARTNER" ? p.worker.user.name : null
  const rooms = p.rooms.filter((r) => r.active)
  const city = bn ? p.shop.cityBn : p.shop.city

  return (
    <div className="mx-auto max-w-5xl">
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "রিসোর্ট ও হোটেল", "Resorts & hotels"), path: "/services/resort-booking" }, { name, path: `/stays/${p.id}` }])} />
      <PageHeader back="/services/resort-booking" title={name} sub={`${kindText(p.kind, locale)} · ${named(locale, p.area)}${p.shopId !== shop.id ? `, ${city}` : ""} · ${owner ? pick(locale, `পার্টনার: ${owner}`, `Partner: ${owner}`) : pick(locale, "HANDYO পরিচালিত", "HANDYO-managed")}`} />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="relative overflow-hidden rounded-3xl bg-canvas">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={name} className="aspect-[16/10] w-full object-cover" />
            ) : null}
            <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">{kindText(p.kind, locale)}</span>
            {p.worker && p.worker.ratingCount > 0 ? <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-amber-600"><Star className="size-3.5 fill-current" aria-hidden /> {p.worker.rating.toFixed(1)}</span> : null}
          </div>
          {photos.length > 1 ? (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {photos.slice(1, 5).map((ph) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={ph} src={photoUrl(ph)} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy" />
              ))}
            </div>
          ) : null}
          {detail ? <p className="mt-4 text-[15px] text-muted-foreground">{detail}</p> : null}
          <p className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-ink"><MapPin className="size-4 text-brand" aria-hidden /> {bn ? p.addressBn || p.address : p.address || p.addressBn || named(locale, p.area)}</p>
          {listOf(p.amenities).length ? (
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-bold text-ink">
              {listOf(p.amenities).map((a) => <span key={a} className="rounded-full bg-canvas px-3 py-1.5">{a}</span>)}
            </div>
          ) : null}
          <p className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"><Clock3 className="size-3.5" aria-hidden /> {pick(locale, `চেক-ইন ${p.checkIn} · চেক-আউট ${p.checkOut}`, `Check-in ${p.checkIn} · check-out ${p.checkOut}`)}</p>
          {policy ? <p className="mt-2 rounded-2xl bg-canvas px-4 py-3 text-sm text-muted-foreground">{policy}</p> : null}
        </div>

        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="p-4 pb-2">
              <h2 className="text-base font-extrabold text-ink">{pick(locale, "রুম ও রাতপ্রতি দাম", "Rooms & nightly prices")}</h2>
              <p className="text-xs text-muted-foreground">{pick(locale, "একটা রুম বেছে তারিখ দিন; খালি থাকলে সাথে সাথে বুক হবে।", "Pick a room and your dates; if it's free, it books right away.")}</p>
            </div>
            {!rooms.length ? <p className="px-4 pb-4 text-sm text-muted-foreground">{pick(locale, "এখনো রুমের দাম দেওয়া হয়নি।", "No room prices set yet.")}</p> : null}
            <ul className="divide-y divide-line">
              {rooms.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-extrabold text-ink"><BedDouble className="mr-1 inline size-4 text-brand" aria-hidden />{r.name}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs font-bold text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden /> {pick(locale, `${r.sleeps} জন`, `Sleeps ${r.sleeps}`)}</span>
                      {r.amenities ? <span>{r.amenities}</span> : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span className="text-xl font-extrabold text-brand">{taka(r.pricePerNight, locale)}<span className="ml-1 text-xs font-semibold text-muted-foreground">/{pick(locale, "রাত", "night")}</span></span>
                    <Link href={`/book-stay/${p.id}?room=${r.id}`} className="btn-primary h-10 px-4 text-sm">{pick(locale, "বুক করুন", "Book")}</Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <p className="text-xs text-muted-foreground">{pick(locale, "বুকিংয়ের পর HANDYO অফিস রিসোর্টকে জানায়; রিসোর্ট নিশ্চিত করলে নোটিশ পাবেন আর চ্যাটে কথা বলতে পারবেন। পেমেন্ট চেক-ইনে ক্যাশ / বিকাশ / নগদ।", "After booking, the HANDYO office alerts the resort; you get a notice when it confirms and can chat. Pay at check-in by cash / bKash / Nagad.")}</p>
        </div>
      </div>
    </div>
  )
}
