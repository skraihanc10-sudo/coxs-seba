import type { Locale } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import type { ActionState } from "@/lib/action"
import { PROPERTY_KINDS, PROPERTY_KIND_TEXT } from "@/lib/stays"
import { ActionForm, SubmitButton } from "@/components/forms"

export type PropertyFormValue = {
  id: string
  kind: string
  areaId: string
  name: string
  nameBn: string
  address: string
  addressBn: string
  amenities: string
  checkIn: string
  checkOut: string
  policy: string
  policyBn: string
  detail: string
  detailBn: string
  /** Room types as lines: name | sleeps | price | rooms | amenities */
  rooms: string
} | null

type Area = { id: string; name: string; nameBn: string }

/** Property fields shared by the public apply form and the partner's add/edit form. */
export function PropertyFields({ locale, property, areas }: { locale: Locale; property: PropertyFormValue; areas: Area[] }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className="label">{pick(locale, "ধরন", "Kind")}</label>
          <select name="kind" defaultValue={property?.kind ?? "RESORT"} className="field" required>
            {PROPERTY_KINDS.map((k) => <option key={k} value={k}>{pick(locale, PROPERTY_KIND_TEXT[k].bn, PROPERTY_KIND_TEXT[k].en)}</option>)}
          </select>
        </div>
        <div><label className="label">{pick(locale, "এলাকা", "Area")}</label>
          <select name="areaId" defaultValue={property?.areaId ?? areas[0]?.id} className="field" required>
            {areas.map((a) => <option key={a.id} value={a.id}>{named(locale, a)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className="label">{pick(locale, "নাম (ইংরেজি)", "Name (English)")}</label><input name="name" defaultValue={property?.name} className="field" required minLength={2} maxLength={100} placeholder="Blue Bay Resort" /></div>
        <div><label className="label">{pick(locale, "নাম (বাংলা, ঐচ্ছিক)", "Name (Bangla, optional)")}</label><input name="nameBn" defaultValue={property?.nameBn} className="field" maxLength={100} placeholder="ব্লু বে রিসোর্ট" /></div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className="label">{pick(locale, "ঠিকানা (বাংলা)", "Address (Bangla)")}</label><input name="addressBn" defaultValue={property?.addressBn} className="field" maxLength={200} placeholder="মেরিন ড্রাইভ, ইনানী" /></div>
        <div><label className="label">{pick(locale, "ঠিকানা (ইংরেজি)", "Address (English)")}</label><input name="address" defaultValue={property?.address} className="field" maxLength={200} placeholder="Marine Drive, Inani" /></div>
      </div>
      <div>
        <label className="label">{pick(locale, "রুমের ধরন ও দাম (প্রতি লাইনে একটা)", "Room types & prices (one per line)")}</label>
        <textarea name="rooms" defaultValue={property?.rooms} className="field min-h-24 font-mono text-xs" required maxLength={4000} placeholder={"Deluxe Sea View | 2 | 6500 | 8 | Sea view, AC, King bed\nFamily Suite | 4 | 11000 | 4 | 2 bedrooms, AC"} />
        <p className="mt-1 text-xs text-muted-foreground">{pick(locale, "ফরম্যাট: রুমের নাম | কতজন থাকে | প্রতি রাত দাম (৳) | মোট কয়টা রুম | সুবিধা। তারিখে কয়টা খালি আছে সেটা এই সংখ্যা থেকে হিসাব হয়।", "Format: room name | sleeps | price per night (৳) | total rooms | amenities. Availability per date is counted against the total.")}</p>
      </div>
      <div><label className="label">{pick(locale, "সুবিধা (কমা দিয়ে)", "Amenities (comma separated)")}</label><input name="amenities" defaultValue={property?.amenities} className="field" maxLength={300} placeholder={pick(locale, "সি ভিউ, পুল, নাস্তা, ওয়াইফাই, পার্কিং", "Sea view, Pool, Breakfast, WiFi, Parking")} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">{pick(locale, "চেক-ইন সময়", "Check-in time")}</label><input name="checkIn" type="time" defaultValue={property?.checkIn ?? "14:00"} className="field" required /></div>
        <div><label className="label">{pick(locale, "চেক-আউট সময়", "Check-out time")}</label><input name="checkOut" type="time" defaultValue={property?.checkOut ?? "12:00"} className="field" required /></div>
      </div>
      <div><label className="label">{pick(locale, "বিবরণ (বাংলা)", "About (Bangla)")}</label><textarea name="detailBn" defaultValue={property?.detailBn} className="field" rows={3} maxLength={1000} placeholder={pick(locale, "সৈকত থেকে কত দূর, কী কী আছে, কাদের জন্য ভালো…", "How far from the beach, what's included, who it suits…")} /></div>
      <div><label className="label">{pick(locale, "বিবরণ (ইংরেজি, ঐচ্ছিক)", "About (English, optional)")}</label><textarea name="detail" defaultValue={property?.detail} className="field" rows={2} maxLength={1000} /></div>
      <div><label className="label">{pick(locale, "নিয়ম / বাতিল নীতি (বাংলা, ঐচ্ছিক)", "Policy / cancellation (Bangla, optional)")}</label><textarea name="policyBn" defaultValue={property?.policyBn} className="field" rows={2} maxLength={600} placeholder={pick(locale, "২৪ ঘণ্টা আগে বাতিল করলে পুরো টাকা ফেরত…", "Free cancellation up to 24 hours before…")} /></div>
      <div><label className="label">{pick(locale, "নিয়ম (ইংরেজি, ঐচ্ছিক)", "Policy (English, optional)")}</label><textarea name="policy" defaultValue={property?.policy} className="field" rows={2} maxLength={600} /></div>
      <div>
        <label className="label">{property ? pick(locale, "নতুন ছবি (ফাঁকা = আগেরগুলো থাকবে), সর্বোচ্চ ৬টা", "New photos (blank keeps the old ones), up to 6") : pick(locale, "ছবি (সর্বোচ্চ ৬টা, প্রথমটা কভার)", "Photos (up to 6, first is the cover)")}</label>
        <input type="file" name="photos" accept="image/*" multiple className="text-xs" />
      </div>
    </>
  )
}

/** Partner adds or edits one of their properties. */
export function PropertyForm({ locale, property, areas, action }: { locale: Locale; property: PropertyFormValue; areas: Area[]; action: (prev: ActionState, form: FormData) => Promise<ActionState> }) {
  return (
    <ActionForm action={action} resetOnSuccess={false} className="card space-y-3 p-4 md:p-5">
      {property ? <input type="hidden" name="id" value={property.id} /> : null}
      <PropertyFields locale={locale} property={property} areas={areas} />
      <SubmitButton>{property ? pick(locale, "সেভ করুন", "Save") : pick(locale, "রিসোর্ট যোগ করুন", "Add property")}</SubmitButton>
      {!property ? <p className="text-center text-xs text-muted-foreground">{pick(locale, "অ্যাডমিনের অনুমোদনের পর সাইটে দেখাবে।", "Shows on the site once the admin approves it.")}</p> : null}
    </ActionForm>
  )
}
