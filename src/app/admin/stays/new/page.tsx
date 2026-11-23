import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { db } from "@/lib/db"
import { officeShop } from "@/lib/shops"
import { activeAreas } from "@/lib/catalog"
import { pick } from "@/lib/i18n"
import { PageHeader } from "@/components/bits"
import { AdminPropertyForm } from "@/components/admin/property-form"

export default async function NewPropertyPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/stays/new"), getLocale()])
  const shop = await officeShop(user)
  const [areas, workers] = await Promise.all([
    activeAreas(shop.id),
    db.workerProfile.findMany({ where: { shopId: shop.id }, include: { user: true }, orderBy: [{ kind: "desc" }, { user: { name: "asc" } }] }),
  ])
  return (
    <div>
      <PageHeader back="/admin/stays" title={pick(locale, "নতুন রিসোর্ট / হোটেল", "Add a property")} sub={pick(locale, "সাথে সাথে সাইটে দেখাবে।", "Goes live on the site at once.")} />
      <AdminPropertyForm locale={locale} property={null} areas={areas} workers={workers} />
    </div>
  )
}
