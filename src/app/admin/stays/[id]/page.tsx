import { notFound } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { db } from "@/lib/db"
import { officeShop } from "@/lib/shops"
import { activeAreas } from "@/lib/catalog"
import { pick } from "@/lib/i18n"
import { propertyById, propertyName, roomsText, STAY_STATUS_TEXT } from "@/lib/stays"
import { PageHeader } from "@/components/bits"
import { AdminPropertyForm } from "@/components/admin/property-form"

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, locale] = await Promise.all([params, requireUser(ADMINS, "/admin/stays"), getLocale()])
  const shop = await officeShop(user)
  const property = await propertyById(id)
  if (!property || property.shopId !== shop.id) notFound()
  const [areas, workers] = await Promise.all([
    activeAreas(shop.id),
    db.workerProfile.findMany({ where: { shopId: shop.id }, include: { user: true }, orderBy: [{ kind: "desc" }, { user: { name: "asc" } }] }),
  ])
  const status = STAY_STATUS_TEXT[property.status]
  const owner = property.worker ? `${property.worker.user.name} · ${property.worker.user.phone ?? ""}` : pick(locale, "HANDYO পরিচালিত", "HANDYO-managed")
  return (
    <div>
      <PageHeader back="/admin/stays" title={propertyName(property, locale)} sub={`${status ? pick(locale, status.bn, status.en) : property.status} · ${owner}`} />
      <AdminPropertyForm locale={locale} property={{ ...property, rooms: roomsText(property.rooms.filter((r) => r.active)) }} areas={areas} workers={workers} />
    </div>
  )
}
