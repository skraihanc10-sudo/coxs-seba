import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { db } from "@/lib/db"
import { pick } from "@/lib/i18n"
import { PageHeader } from "@/components/bits"
import { WorkerForm } from "@/components/admin/worker-form"

export default async function NewWorkerPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/workers/new"), getLocale()])
  const shop = await officeShop(user)
  const [categories, areas] = await Promise.all([
    db.serviceCategory.findMany({ where: { shopId: shop.id }, orderBy: { sort: "asc" } }),
    db.serviceArea.findMany({ where: { shopId: shop.id }, orderBy: { sort: "asc" } }),
  ])
  return (
    <div>
      <PageHeader back="/admin/workers" title={pick(locale, "নতুন কর্মী", "New worker")} sub={pick(locale, `${shop.nameBn} শপের কর্মী হবেন`, `Joins ${shop.name}`)} />
      <WorkerForm locale={locale} worker={null} categories={categories} areas={areas} shop={shop} />
    </div>
  )
}
