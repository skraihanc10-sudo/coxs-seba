import type { Locale } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import type { ActionState } from "@/lib/action"
import { ActionForm, SubmitButton } from "@/components/forms"

type Vehicle = {
  id: string
  offeringId: string
  title: string
  titleBn: string
  plate: string
  seats: number
  detail: string
  detailBn: string
  pricePerHour: number
  pricePerDay: number
  minHours: number
} | null

type Offering = { id: string; name: string; nameBn: string }

/** Just the vehicle fields: type, name, plate, seats, rates, detail, photos. Reused by the partner form and the public apply form. */
export function VehicleFields({ locale, vehicle, offerings }: { locale: Locale; vehicle: Vehicle; offerings: Offering[] }) {
  return (
    <>
      <div><label className="label">{pick(locale, "গাড়ির ধরন", "Vehicle type")}</label>
        <select name="offeringId" defaultValue={vehicle?.offeringId ?? offerings[0]?.id} className="field" required>
          {offerings.map((o) => <option key={o.id} value={o.id}>{named(locale, o)}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className="label">{pick(locale, "গাড়ির নাম (ইংরেজি)", "Vehicle name (English)")}</label><input name="title" defaultValue={vehicle?.title} className="field" required minLength={2} maxLength={80} placeholder="Toyota Noah 2018" /></div>
        <div><label className="label">{pick(locale, "গাড়ির নাম (বাংলা, ঐচ্ছিক)", "Vehicle name (Bangla, optional)")}</label><input name="titleBn" defaultValue={vehicle?.titleBn} className="field" maxLength={80} placeholder="টয়োটা নোয়া ২০১৮" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">{pick(locale, "নম্বর প্লেট (ঐচ্ছিক)", "Plate (optional)")}</label><input name="plate" defaultValue={vehicle?.plate} className="field" maxLength={30} placeholder="চট্ট মেট্রো-গ ১২-৩৪৫৬" /></div>
        <div><label className="label">{pick(locale, "সিট", "Seats")}</label><input name="seats" type="number" inputMode="numeric" min={1} max={60} defaultValue={vehicle?.seats ?? 2} className="field" required /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">{pick(locale, "৳/ঘণ্টা", "৳/hour")}</label><input name="pricePerHour" type="number" inputMode="numeric" min={0} max={100000} defaultValue={vehicle?.pricePerHour ?? 0} className="field" /></div>
        <div><label className="label">{pick(locale, "৳/দিন", "৳/day")}</label><input name="pricePerDay" type="number" inputMode="numeric" min={0} max={500000} defaultValue={vehicle?.pricePerDay ?? 0} className="field" /></div>
        <div><label className="label">{pick(locale, "কমপক্ষে ঘণ্টা", "Min hours")}</label><input name="minHours" type="number" inputMode="numeric" min={1} max={24} defaultValue={vehicle?.minHours ?? 2} className="field" /></div>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">{pick(locale, "ঘণ্টা বা দিনের অন্তত একটা ভাড়া দিন। ড্রাইভার আর তেল ধরে দাম লিখুন।", "Give an hourly or a daily rate (or both), including driver and fuel.")}</p>
      <div><label className="label">{pick(locale, "বিবরণ (বাংলা)", "Details (Bangla)")}</label><textarea name="detailBn" defaultValue={vehicle?.detailBn} className="field" rows={2} maxLength={500} placeholder={pick(locale, "এসি, ড্রাইভারসহ, লাগেজ জায়গা…", "AC, with driver, luggage space…")} /></div>
      <div><label className="label">{pick(locale, "বিবরণ (ইংরেজি, ঐচ্ছিক)", "Details (English, optional)")}</label><textarea name="detail" defaultValue={vehicle?.detail} className="field" rows={2} maxLength={500} /></div>
      <div>
        <label className="label">{vehicle ? pick(locale, "নতুন ছবি (ফাঁকা = আগেরগুলো থাকবে), সর্বোচ্চ ৪টা", "New photos (blank keeps the old ones), up to 4") : pick(locale, "গাড়ির ছবি (সর্বোচ্চ ৪টা)", "Vehicle photos (up to 4)")}</label>
        <input type="file" name="photos" accept="image/*" multiple className="text-xs" />
      </div>
    </>
  )
}

/** Partner adds or edits one of their vehicles. */
export function VehicleForm({ locale, vehicle, offerings, action }: { locale: Locale; vehicle: Vehicle; offerings: Offering[]; action: (prev: ActionState, form: FormData) => Promise<ActionState> }) {
  return (
    <ActionForm action={action} resetOnSuccess={false} className="card space-y-3 p-4 md:p-5">
      {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}
      <VehicleFields locale={locale} vehicle={vehicle} offerings={offerings} />
      <SubmitButton>{vehicle ? pick(locale, "সেভ করুন", "Save") : pick(locale, "গাড়ি যোগ করুন", "Add vehicle")}</SubmitButton>
      {!vehicle ? <p className="text-center text-xs text-muted-foreground">{pick(locale, "অ্যাডমিনের অনুমোদনের পর গাড়িটা সাইটে দেখাবে।", "The vehicle shows on the site once the admin approves it.")}</p> : null}
    </ActionForm>
  )
}
