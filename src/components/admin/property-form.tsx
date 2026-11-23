import type { Locale } from "@/lib/format"
import { pick } from "@/lib/i18n"
import { photoUrl } from "@/lib/vehicles"
import { listOf } from "@/lib/stays"
import { savePropertyAction } from "@/actions/stays"
import { ActionForm, SubmitButton } from "@/components/forms"
import { PropertyFields, type PropertyFormValue } from "@/components/partner/property-form"

type Worker = { id: string; kind: string; user: { name: string; phone: string | null } }

/** Admin adds a HANDYO-managed property or edits any property of the shop (owner, sort, photos preview). */
export function AdminPropertyForm({
  locale,
  property,
  areas,
  workers,
}: {
  locale: Locale
  property: (NonNullable<PropertyFormValue> & { workerId: string | null; sort: number; photos: string }) | null
  areas: Array<{ id: string; name: string; nameBn: string }>
  workers: Worker[]
}) {
  const photos = property ? listOf(property.photos) : []
  return (
    <ActionForm action={savePropertyAction} resetOnSuccess={false} className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {property ? <input type="hidden" name="id" value={property.id} /> : null}
      <div className="card space-y-3 p-4">
        <PropertyFields locale={locale} property={property} areas={areas} />
      </div>
      <div className="space-y-4">
        <div className="card space-y-3 p-4">
          <div>
            <label className="label" htmlFor="workerId">{pick(locale, "মালিক (ঐচ্ছিক, ফাঁকা = HANDYO পরিচালিত)", "Owner (optional, blank = HANDYO-managed)")}</label>
            <select id="workerId" name="workerId" defaultValue={property?.workerId ?? ""} className="field">
              <option value="">{pick(locale, "HANDYO পরিচালিত", "HANDYO-managed")}</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.user.name}{w.user.phone ? ` · ${w.user.phone}` : ""}{w.kind === "PARTNER" ? ` · ${pick(locale, "পার্টনার", "partner")}` : ""}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">{pick(locale, "মালিক দিলে বুকিং তার পার্টনার প্যানেলে পাঠানো যাবে আর তিনি পার্টনার শেয়ার পাবেন।", "With an owner set, bookings can be sent to their partner panel and they earn the partner share.")}</p>
          </div>
          {photos.length ? (
            <div>
              <p className="label">{pick(locale, "বর্তমান ছবি", "Current photos")}</p>
              <div className="flex flex-wrap gap-2">
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p} src={photoUrl(p)} alt="" className="size-16 rounded-lg object-cover ring-1 ring-line" />
                ))}
              </div>
            </div>
          ) : null}
          <div><label className="label" htmlFor="sort">{pick(locale, "ক্রম (ছোট সংখ্যা আগে)", "Sort (lower first)")}</label><input id="sort" name="sort" type="number" min={0} max={999} defaultValue={property?.sort ?? 0} className="field w-32" /></div>
        </div>
        <SubmitButton>{property ? pick(locale, "সেভ করুন", "Save") : pick(locale, "রিসোর্ট যোগ করুন", "Add property")}</SubmitButton>
      </div>
    </ActionForm>
  )
}
