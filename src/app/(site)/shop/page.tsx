import type { Metadata } from "next"
import { getLocale } from "@/lib/auth"
import { currentShop } from "@/lib/shops"
import { activeCategories } from "@/lib/catalog"
import { getSettings } from "@/lib/settings"
import { liveProducts, liveStores, shopGroups, shopRules } from "@/lib/shop"
import { photosOf, photoUrl } from "@/lib/vehicles"
import { named, pick } from "@/lib/i18n"
import { pageMeta } from "@/lib/seo"
import { PageHeader, TrustStrip } from "@/components/bits"
import { ShopMarket } from "@/components/shop-market"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return pageMeta({
    locale,
    title: pick(locale, "HANDYO দোকান · শুঁটকি, আচার ও আরও, সারা দেশে ডেলিভারি", "HANDYO shop · dried fish, pickles and more, delivered nationwide"),
    description: pick(locale, "কক্সবাজারের পার্টনার দোকানগুলোর শুঁটকি, আচার আর অন্য পণ্য এক জায়গায়। দোকান বেছে দেখুন কে কী বিক্রি করে, কার্টে নিন, হাতে পেয়ে টাকা দিন।", "Dried fish, pickles and more from Cox's Bazar partner stores in one place. Pick a store to see what it sells, add to cart, pay on delivery."),
    path: "/shop",
  })
}

/**
 * The one shop: every product of every SHOP-flow category (dried fish,
 * pickles, ...) with a store filter, so a customer sees what each store
 * sells and stocks. Laundry keeps its own per-piece page.
 */
export default async function ShopIndexPage() {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  const bn = locale === "bn"
  const categories = (await activeCategories(shop.id)).filter((c) => c.flow === "SHOP")
  const catIds = new Set(categories.map((c) => c.id))
  const [all, groups, settings, stores] = await Promise.all([liveProducts(shop.id), shopGroups(shop.id, true), getSettings(shop.id), liveStores(shop.id)])
  const products = all.filter((p) => !p.group.categoryId || catIds.has(p.group.categoryId))
  const groupIds = new Set(products.map((p) => p.groupId))
  const liveStoreList = stores.filter((st) => products.some((p) => p.storeId === st.id))
  return (
    <div>
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "দোকান", "Shop"), path: "/shop" }])} />
      <PageHeader
        back="/"
        title={pick(locale, "দোকান: শুঁটকি, আচার ও আরও", "Shop: dried fish, pickles and more")}
        sub={pick(locale, `${liveStoreList.length}টা পার্টনার দোকান · ${products.length}টা পণ্য · দোকান বেছে দেখুন কে কী বিক্রি করে · সারা দেশে কুরিয়ার`, `${liveStoreList.length} partner stores · ${products.length} products · pick a store to see what it sells · courier nationwide`)}
      />
      <ShopMarket
        locale={locale}
        rules={shopRules(settings)}
        groups={groups.filter((g) => groupIds.has(g.id)).map((g) => ({ id: g.id, name: named(locale, g) }))}
        stores={liveStoreList.map((st) => ({ id: st.id, slug: st.slug, name: named(locale, st), cover: photosOf(st)[0] ? photoUrl(photosOf(st)[0]) : null }))}
        partnerHref="/partner"
        products={products.map((p) => ({
          id: p.id,
          slug: p.slug,
          groupId: p.groupId,
          storeId: p.storeId,
          storeName: p.store ? named(locale, p.store) : "",
          name: bn ? p.nameBn || p.name : p.name || p.nameBn,
          cover: photosOf(p)[0] ? photoUrl(photosOf(p)[0]) : null,
          badge: p.badge,
          variants: p.variants.filter((v) => v.active).map((v) => ({ id: v.id, label: v.label, price: v.price, oldPrice: v.oldPrice, stock: v.stock })),
        }))}
      />
      <TrustStrip
        locale={locale}
        items={[
          [pick(locale, "দোকান অনুযায়ী আলাদা পার্সেল", "A parcel per store"), pick(locale, "প্রতিটা দোকান নিজের পণ্য প্যাক করে পাঠায়।", "Each store packs and ships its own products.")],
          [pick(locale, "দাম আগেই লেখা", "Price up front"), pick(locale, "লুকানো চার্জ নেই; হাতে পেয়ে টাকা দিন।", "No hidden charges; pay on delivery.")],
        ]}
      />
    </div>
  )
}
