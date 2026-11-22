import { requireUser, getLocale } from "@/lib/auth"
import { pick } from "@/lib/i18n"
import { allShops } from "@/lib/shops"
import { PageHeader } from "@/components/bits"
import { ShopForm } from "@/components/admin/shop-form"

export default async function NewShopPage() {
  const [, locale] = await Promise.all([requireUser(["OWNER"], "/admin/shops/new"), getLocale()])
  const shops = await allShops()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back="/admin/shops"
        title={pick(locale, "নতুন শপ", "New shop")}
        sub={pick(locale, "নতুন শাখা বা পার্টনার ব্যবসা যোগ করুন। তৈরি হলে আপনি সেই শপে সুইচ করে সেবা, কর্মী আর স্টাফ সাজাতে পারবেন।", "Add a new branch or partner business. Once created you can switch into it to set up services, workers and staff.")}
      />
      <ShopForm locale={locale} shops={shops} defaultCopyFrom={shops[0]?.id} />
    </div>
  )
}
