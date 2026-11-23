import type { Locale } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { photoUrl, photosOf } from "@/lib/vehicles"
import { saveVehicleAction } from "@/actions/vehicles"
import { ActionForm, SubmitButton } from "@/components/forms"

type Vehicle = {
  id: string
  workerId: string | null
  offeringId: string
  title: string
  titleBn: string
  plate: string
  seats: number
  photos: string
  detail: string
  detailBn: string
  pricePerHour: number
  pricePerDay: number
  pricePerHalfDay: number
  specs: string
  routes: string
  minHours: number
  sort: number
} | null

export function VehicleForm({
  locale,
  vehicle,
  offerings,
  workers,
}: {
  locale: Locale
  vehicle: Vehicle
  offerings: Array<{ id: string; name: string; nameBn: string }>
  workers: Array<{ id: string; kind: string; user: { name: string; phone: string | null } }>
}) {
  const photos = vehicle ? photosOf(vehicle) : []
  return (
    <ActionForm action={saveVehicleAction} resetOnSuccess={false} className="grid gap-4 md:grid-cols-2">
      {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}
      <div className="card space-y-3 p-4">
        <div>
          <label className="label" htmlFor="offeringId">{pick(locale, "গাড়ির ধরন", "Vehicle type")}</label>
          <select id="offeringId" name="offeringId" defaultValue={vehicle?.offeringId ?? offerings[0]?.id} className="field" required>
            {offerings.map((o) => <option key={o.id} value={o.id}>{named(locale, o)}</option>)}
          </select>
        </div>
        <div><label className="label" htmlFor="title">{pick(locale, "গাড়ির নাম (ইংরেজি)", "Vehicle name (English)")}</label><input id="title" name="title" defaultValue={vehicle?.title} className="field" required minLength={2} maxLength={80} placeholder="Toyota Noah 2018" /></div>
        <div><label className="label" htmlFor="titleBn">{pick(locale, "গাড়ির নাম (বাংলা)", "Vehicle name (Bangla)")}</label><input id="titleBn" name="titleBn" defaultValue={vehicle?.titleBn} className="field" maxLength={80} placeholder="টয়োটা নোয়াহ ২০১৮" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="plate">{pick(locale, "নম্বর প্লেট", "Plate")}</label><input id="plate" name="plate" defaultValue={vehicle?.plate} className="field" maxLength={30} /></div>
          <div><label className="label" htmlFor="seats">{pick(locale, "সিট", "Seats")}</label><input id="seats" name="seats" type="number" min={1} max={60} defaultValue={vehicle?.seats ?? 4} className="field" required /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="pricePerHalfDay">{pick(locale, "হাফ-ডে, ৬ ঘণ্টা (৳)", "Half-day, 6 h (৳)")}</label><input id="pricePerHalfDay" name="pricePerHalfDay" type="number" min={0} max={500000} defaultValue={vehicle?.pricePerHalfDay ?? 0} className="field" /></div>
          <div><label className="label" htmlFor="specs">{pick(locale, "স্পেক ট্যাগ (কমা দিয়ে)", "Spec tags (comma separated)")}</label><input id="specs" name="specs" defaultValue={vehicle?.specs} className="field" maxLength={200} placeholder="150cc, ABS, AC" /></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="label" htmlFor="pricePerHour">{pick(locale, "ঘণ্টায় (৳)", "Per hour (৳)")}</label><input id="pricePerHour" name="pricePerHour" type="number" min={0} max={100000} defaultValue={vehicle?.pricePerHour ?? 0} className="field" /></div>
          <div><label className="label" htmlFor="pricePerDay">{pick(locale, "দিনে (৳)", "Per day (৳)")}</label><input id="pricePerDay" name="pricePerDay" type="number" min={0} max={500000} defaultValue={vehicle?.pricePerDay ?? 0} className="field" /></div>
          <div><label className="label" htmlFor="minHours">{pick(locale, "সর্বনিম্ন ঘণ্টা", "Min hours")}</label><input id="minHours" name="minHours" type="number" min={1} max={24} defaultValue={vehicle?.minHours ?? 2} className="field" /></div>
        </div>
        <p className="text-xs text-muted-foreground">{pick(locale, "ঘণ্টা বা দিনের অন্তত একটা ভাড়া দিন; ০ দিলে ওই হিসাবে ভাড়া হবে না।", "Give an hourly or a daily rate (or both); 0 switches that unit off.")}</p>
      </div>
      <div className="space-y-4">
        <div className="card space-y-3 p-4">
          <div>
            <label className="label" htmlFor="workerId">{pick(locale, "মালিক / চালক (ঐচ্ছিক, ফাঁকা = HANDYO-র নিজের)", "Owner / driver (optional, blank = HANDYO's own)")}</label>
            <select id="workerId" name="workerId" defaultValue={vehicle?.workerId ?? ""} className="field">
              <option value="">{pick(locale, "HANDYO-র নিজের গাড়ি", "HANDYO's own vehicle")}</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.user.name}{w.user.phone ? ` · ${w.user.phone}` : ""}{w.kind === "PARTNER" ? ` · ${pick(locale, "পার্টনার", "partner")}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="routes">{pick(locale, "রুট প্যাকেজ (প্রতি লাইনে একটা)", "Route packages (one per line)")}</label>
            <textarea id="routes" name="routes" defaultValue={vehicle?.routes} className="field min-h-24 font-mono text-xs" maxLength={4000} placeholder={"Cox's Bazar to Patuartek | Himchari, Inani, Patuartek | 6–7 hours | 7–13 people | 4000"} />
            <p className="mt-1 text-xs text-muted-foreground">{pick(locale, "ফরম্যাট: নাম | দর্শনীয় জায়গা | সময় | কতজন | দাম। কাস্টমার গাড়ির পেজে টেবিলে দেখে রুট বেছে বুক করে।", "Format: name | attractions | duration | capacity | price. Customers pick a route from the table on the vehicle page.")}</p>
          </div>
          <div><label className="label" htmlFor="detailBn">{pick(locale, "বিবরণ (বাংলা)", "Details (Bangla)")}</label><textarea id="detailBn" name="detailBn" defaultValue={vehicle?.detailBn} className="field min-h-20" maxLength={500} placeholder={pick(locale, "এসি, চালকসহ, জ্বালানি আলাদা…", "AC, with driver, fuel extra…")} /></div>
          <div><label className="label" htmlFor="detail">{pick(locale, "বিবরণ (ইংরেজি)", "Details (English)")}</label><textarea id="detail" name="detail" defaultValue={vehicle?.detail} className="field min-h-20" maxLength={500} /></div>
          <div>
            <label className="label" htmlFor="photos">{pick(locale, "ছবি (সর্বোচ্চ ৪টি, প্রথমটা কভার)", "Photos (up to 4, first is the cover)")}</label>
            <input id="photos" name="photos" type="file" accept="image/*" multiple className="text-xs" />
            {photos.length ? (
              <div className="mt-2 flex gap-2">
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p} src={photoUrl(p)} alt="" className="size-16 rounded-lg object-cover ring-1 ring-line" />
                ))}
              </div>
            ) : null}
            {vehicle ? <p className="mt-1 text-xs text-muted-foreground">{pick(locale, "নতুন ছবি দিলে আগেরগুলো বদলে যাবে।", "New photos replace the old ones.")}</p> : null}
          </div>
          <div><label className="label" htmlFor="sort">{pick(locale, "ক্রম (ছোট সংখ্যা আগে)", "Sort (lower first)")}</label><input id="sort" name="sort" type="number" min={0} max={999} defaultValue={vehicle?.sort ?? 0} className="field w-32" /></div>
        </div>
        <SubmitButton>{vehicle ? pick(locale, "সেভ করুন", "Save") : pick(locale, "গাড়ি যোগ করুন", "Add vehicle")}</SubmitButton>
      </div>
    </ActionForm>
  )
}
