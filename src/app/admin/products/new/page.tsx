import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { pick } from "@/lib/i18n"
import { liveStores, shopGroups } from "@/lib/shop"
import { EmptyState, PageHeader } from "@/components/bits"
import { ProductForm } from "@/components/admin/product-form"

export default async function NewProductPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/products/new"), getLocale()])
  const shop = await officeShop(user)
  const [groups, stores] = await Promise.all([shopGroups(shop.id, false), liveStores(shop.id)])
  return (
    <div>
      <PageHeader back="/admin/products" title={pick(locale, "নতুন প্রোডাক্ট", "Add a product")} sub={pick(locale, "সেভ করলেই সাইটে দেখাবে।", "Shows on the site as soon as you save.")} />
      {!groups.length ? <EmptyState title={pick(locale, "আগে একটা গ্রুপ বানান", "Create a group first")} href="/admin/products" action={pick(locale, "প্রোডাক্ট পেজে যান", "Go to products")} /> : <ProductForm locale={locale} product={null} groups={groups} stores={stores} />}
    </div>
  )
}
