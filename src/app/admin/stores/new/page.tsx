import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { db } from "@/lib/db"
import { officeShop } from "@/lib/shops"
import { pick } from "@/lib/i18n"
import { PageHeader } from "@/components/bits"
import { AdminStoreForm } from "@/components/admin/store-form"

export default async function NewStorePage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/stores/new"), getLocale()])
  const shop = await officeShop(user)
  const workers = await db.workerProfile.findMany({ where: { shopId: shop.id }, include: { user: true }, orderBy: [{ kind: "desc" }, { user: { name: "asc" } }] })
  return (
    <div>
      <PageHeader back="/admin/stores" title={pick(locale, "নতুন দোকান", "Add a store")} sub={pick(locale, "সাথে সাথে সাইটে দেখাবে; পণ্য অ্যাডমিন → প্রোডাক্ট থেকে।", "Live at once; add products under Admin → Products.")} />
      <AdminStoreForm locale={locale} store={null} workers={workers} />
    </div>
  )
}
