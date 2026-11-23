import { notFound } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { db } from "@/lib/db"
import { officeShop } from "@/lib/shops"
import { pick } from "@/lib/i18n"
import { liveStores, productName, shopGroups, variantsText } from "@/lib/shop"
import { PageHeader } from "@/components/bits"
import { ProductForm } from "@/components/admin/product-form"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, locale] = await Promise.all([params, requireUser(ADMINS, "/admin/products"), getLocale()])
  const shop = await officeShop(user)
  const product = await db.product.findFirst({ where: { id, shopId: shop.id }, include: { variants: { where: { active: true }, orderBy: { sort: "asc" } } } })
  if (!product) notFound()
  const [groups, stores] = await Promise.all([shopGroups(shop.id, false), liveStores(shop.id)])
  return (
    <div>
      <PageHeader back="/admin/products" title={productName(product, locale)} sub={product.active ? pick(locale, "সাইটে দেখাচ্ছে", "Live on the site") : pick(locale, "লুকানো", "Hidden")} />
      <ProductForm locale={locale} product={{ ...product, variants: variantsText(product.variants) }} groups={groups} stores={stores} />
    </div>
  )
}
