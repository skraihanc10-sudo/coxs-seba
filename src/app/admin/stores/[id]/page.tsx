import Link from "next/link"
import { notFound } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { db } from "@/lib/db"
import { officeShop } from "@/lib/shops"
import { named, pick } from "@/lib/i18n"
import { storeById, STORE_STATUS_TEXT } from "@/lib/shop"
import { PageHeader } from "@/components/bits"
import { AdminStoreForm } from "@/components/admin/store-form"

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, locale] = await Promise.all([params, requireUser(ADMINS, "/admin/stores"), getLocale()])
  const shop = await officeShop(user)
  const store = await storeById(id)
  if (!store || store.shopId !== shop.id) notFound()
  const workers = await db.workerProfile.findMany({ where: { shopId: shop.id }, include: { user: true }, orderBy: [{ kind: "desc" }, { user: { name: "asc" } }] })
  const status = STORE_STATUS_TEXT[store.status]
  return (
    <div>
      <PageHeader back="/admin/stores" title={named(locale, store)} sub={`${status ? pick(locale, status.bn, status.en) : store.status} · ${store._count.products} ${pick(locale, "পণ্য", "products")}`} action={<Link href="/admin/products" className="btn-soft h-10 px-4 text-sm">{pick(locale, "পণ্য দেখুন", "See products")}</Link>} />
      <AdminStoreForm locale={locale} store={{ id: store.id, name: store.name, nameBn: store.nameBn, address: store.address, addressBn: store.addressBn, detail: store.detail, detailBn: store.detailBn, workerId: store.workerId, sort: store.sort, photos: store.photos }} workers={workers} />
    </div>
  )
}
