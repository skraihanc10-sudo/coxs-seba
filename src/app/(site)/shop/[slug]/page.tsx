import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { currentShop } from "@/lib/shops"
import { getSettings } from "@/lib/settings"
import { named, pick } from "@/lib/i18n"
import { taka } from "@/lib/format"
import { photoUrl, photosOf } from "@/lib/vehicles"
import { priceRange, productBySlug, productName, shopRules } from "@/lib/shop"
import { clip, pageMeta } from "@/lib/seo"
import { PageHeader } from "@/components/bits"
import { ProductBuyBox } from "@/components/product-buy-box"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ slug }, locale, shop] = await Promise.all([params, getLocale(), currentShop()])
  const p = await productBySlug(shop.id, slug)
  if (!p) return { title: pick(locale, "পণ্য পাওয়া যায়নি", "Product not found"), robots: { index: false, follow: false } }
  const [lo] = priceRange(p)
  return pageMeta({
    locale,
    title: `${productName(p, locale)} · ${taka(lo, locale)}${pick(locale, " থেকে", "+")} · ${named(locale, p.group)}`,
    description: clip(`${locale === "bn" ? p.detailBn || p.detail : p.detail || p.detailBn} ${pick(locale, "কক্সবাজার থেকে সারা দেশে কুরিয়ার, পণ্য হাতে পেয়ে টাকা দিন।", "Courier from Cox's Bazar nationwide, pay on delivery.")}`),
    path: `/shop/${p.slug}`,
  })
}

/** One product: photos, description, variant picker and add-to-cart. */
export default async function ProductPage({ params }: { params: Params }) {
  const [{ slug }, locale, shop] = await Promise.all([params, getLocale(), currentShop()])
  const p = await productBySlug(shop.id, slug)
  if (!p) notFound()
  const settings = await getSettings(shop.id)
  const backSlug = (p.group.categoryId ? (await db.serviceCategory.findUnique({ where: { id: p.group.categoryId }, select: { slug: true } }))?.slug : null) ?? "shutki"
  const rules = shopRules(settings)
  const bn = locale === "bn"
  const name = productName(p, locale)
  const photos = photosOf(p)
  const detail = bn ? p.detailBn || p.detail : p.detail || p.detailBn
  return (
    <div className="mx-auto max-w-4xl">
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "শুঁটকি ও আচার", "Dried fish & pickles"), path: "/services/shutki" }, { name, path: `/shop/${p.slug}` }])} />
      <PageHeader back={`/services/${backSlug}`} title={name} sub={`${named(locale, p.group)}${p.store ? ` · ${named(locale, p.store)}` : ""}`} />
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <div className="relative overflow-hidden rounded-3xl bg-canvas">
            {photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl(photos[0])} alt={name} className="aspect-square w-full object-cover" />
            ) : null}
            {p.badge ? <span className="absolute top-3 left-3 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">{p.badge}</span> : null}
          </div>
          {photos.length > 1 ? (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {photos.slice(1, 5).map((ph) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={ph} src={photoUrl(ph)} alt="" className="aspect-square w-full rounded-xl object-cover" loading="lazy" />
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          <ProductBuyBox locale={locale} productId={p.id} variants={p.variants.filter((v) => v.active).map((v) => ({ id: v.id, label: v.label, price: v.price, oldPrice: v.oldPrice, stock: v.stock }))} />
          {detail ? <p className="text-[15px] text-muted-foreground">{detail}</p> : null}
          <ul className="space-y-1 rounded-2xl bg-canvas px-4 py-3 text-sm text-muted-foreground">
            <li>✓ {pick(locale, `সরাসরি কক্সবাজার থেকে কুরিয়ারে, ডেলিভারি চার্জ ${taka(rules.delivery, locale)}${rules.freeAbove ? ` (${taka(rules.freeAbove, locale)}-এর ওপরে ফ্রি)` : ""}`, `Courier straight from Cox's Bazar, delivery ${taka(rules.delivery, locale)}${rules.freeAbove ? ` (free above ${taka(rules.freeAbove, locale)})` : ""}`)}</li>
            <li>✓ {pick(locale, "পণ্য হাতে পেয়ে দেখে টাকা দিন (COD), বিকাশ / নগদও চলে", "Check the goods then pay (COD); bKash / Nagad also accepted")}</li>
            <li>✓ {pick(locale, `ন্যূনতম অর্ডার ${taka(rules.minOrder, locale)}`, `Minimum order ${taka(rules.minOrder, locale)}`)}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
