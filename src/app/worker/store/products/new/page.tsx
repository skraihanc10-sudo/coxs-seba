import { redirect } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { pick } from "@/lib/i18n"
import { partnerStore, shopGroups } from "@/lib/shop"
import { partnerProductAction } from "@/actions/shop"
import { PageHeader } from "@/components/bits"
import { ProductForm } from "@/components/admin/product-form"

export default async function PartnerNewProductPage() {
  const [user, locale] = await Promise.all([requireUser(["WORKER"], "/worker/store/products/new"), getLocale()])
  const store = user.worker ? await partnerStore(user.worker.id) : null
  if (!store || (store.status !== "APPROVED" && store.status !== "PAUSED")) redirect("/worker/store")
  const groups = await shopGroups(store.shopId)
  return (
    <div>
      <PageHeader back="/worker/store" title={pick(locale, "নতুন পণ্য", "Add a product")} sub={pick(locale, "সেভ করলেই আপনার দোকানের নামে সাইটে দেখাবে।", "Shows on the site under your store as soon as you save.")} />
      <ProductForm locale={locale} product={null} groups={groups} action={partnerProductAction} />
    </div>
  )
}
