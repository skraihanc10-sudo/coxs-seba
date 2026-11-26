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
import { PageHeader, TrustStrip } from "@/components/bits"
import { PhotoGallery } from "@/components/photo-gallery"
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
          <PhotoGallery photos={photos.map(photoUrl)} alt={name} aspect="aspect-square" badge={p.badge || undefined} />
        </div>
        <div className="space-y-4">
          <ProductBuyBox locale={locale} productId={p.id} variants={p.variants.filter((v) => v.active).map((v) => ({ id: v.id, label: v.label, price: v.price, oldPrice: v.oldPrice, stock: v.stock }))} />
          {detail ? <p className="text-[15px] text-muted-foreground">{detail}</p> : null}
          <TrustStrip
            locale={locale}
            items={[
              [pick(locale, "কক্সবাজার থেকে কুরিয়ার", "Courier from Cox's Bazar"), pick(locale, `ডেলিভারি ${taka(rules.delivery, locale)}${rules.freeAbove ? `, ${taka(rules.freeAbove, locale)}-এর ওপরে ফ্রি` : ""}`, `Delivery ${taka(rules.delivery, locale)}${rules.freeAbove ? `, free above ${taka(rules.freeAbove, locale)}` : ""}`)],
              [pick(locale, "ন্যূনতম অর্ডার", "Minimum order"), taka(rules.minOrder, locale)],
              [pick(locale, "হাতে পেয়ে পেমেন্ট", "Pay on delivery"), pick(locale, "COD, বিকাশ / নগদও চলে", "COD; bKash / Nagad too")],
              [pick(locale, "দোকান অনুযায়ী পার্সেল", "Parcel per store"), pick(locale, "প্রতিটা দোকান আলাদা পাঠায়", "Each store ships its own")],
            ]}
          />
        </div>
      </div>
    </div>
  )
}
