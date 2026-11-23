import { notFound, redirect } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { pick } from "@/lib/i18n"
import { partnerStore, productName, shopGroups, variantsText } from "@/lib/shop"
import { partnerProductAction } from "@/actions/shop"
import { PageHeader } from "@/components/bits"
import { ProductForm } from "@/components/admin/product-form"

export default async function PartnerEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, locale] = await Promise.all([params, requireUser(["WORKER"], "/worker/store"), getLocale()])
  const store = user.worker ? await partnerStore(user.worker.id) : null
  if (!store) redirect("/worker/store")
  const product = await db.product.findFirst({ where: { id, storeId: store.id }, include: { variants: { where: { active: true }, orderBy: { sort: "asc" } } } })
  if (!product) notFound()
  const groups = await shopGroups(store.shopId)
  return (
    <div>
      <PageHeader back="/worker/store" title={productName(product, locale)} sub={product.active ? pick(locale, "সাইটে দেখাচ্ছে", "Live on the site") : pick(locale, "লুকানো", "Hidden")} />
      <ProductForm locale={locale} product={{ ...product, variants: variantsText(product.variants) }} groups={groups} action={partnerProductAction} />
    </div>
  )
}
