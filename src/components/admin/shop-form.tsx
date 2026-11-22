import type { Locale } from "@/lib/format"
import { pick } from "@/lib/i18n"
import { saveShopAction } from "@/actions/admin"
import { ActionForm, SubmitButton } from "@/components/forms"

export type ShopFormShop = {
  id: string
  slug: string
  name: string
  nameBn: string
  city: string
  cityBn: string
  kind: string
  phone: string
  whatsapp: string
  email: string
  address: string
  addressBn: string
  blurb: string
  blurbBn: string
  sort: number
}

/**
 * Owner form for one shop. With `shop` it edits (hidden `id`, no areas/copy/
 * first-admin blocks); without it, creates a new shop via `saveShopAction`.
 */
export function ShopForm({ locale, shop, shops = [], defaultCopyFrom }: { locale: Locale; shop?: ShopFormShop | null; shops?: Array<{ id: string; name: string; nameBn: string }>; defaultCopyFrom?: string }) {
  const editing = Boolean(shop)
  return (
    <ActionForm action={saveShopAction} resetOnSuccess={false} className="space-y-4">
      {shop ? <input type="hidden" name="id" value={shop.id} /> : null}

      {!editing ? (
        <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-ink">
          {pick(
            locale,
            "প্রতিটা শপ আলাদা: নিজের সেবা ও দাম, কর্মী, স্টাফ, বুকিং, চ্যাট আর অ্যাকাউন্ট। এক শপের কিছুই অন্য শপে দেখা যায় না। মালিক হিসেবে আপনি সব শপ দেখেন।",
            "Each shop is completely separate: its own services and prices, workers, staff, bookings, chats and accounts. Nothing from one shop shows in another. As owner you see them all.",
          )}
        </p>
      ) : null}

      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <h3 className="display text-base font-extrabold text-ink sm:col-span-2">{pick(locale, "শপের পরিচয়", "Shop identity")}</h3>
        <Field id="slug" label="slug (URL)" hint={pick(locale, "ছোট হাতের ইংরেজি, সংখ্যা, -", "lowercase letters, numbers, dashes")}>
          <input id="slug" name="slug" defaultValue={shop?.slug} className="field" required pattern="[a-z0-9-]{2,40}" placeholder="dhaka" />
        </Field>
        <Field id="sort" label={pick(locale, "ক্রম", "Order")}>
          <input id="sort" name="sort" type="number" defaultValue={shop?.sort ?? shops.length} className="field" min={0} max={999} />
        </Field>
        <Field id="nameBn" label={pick(locale, "নাম (বাংলা)", "Name (Bangla)")}>
          <input id="nameBn" name="nameBn" defaultValue={shop?.nameBn} className="field" required minLength={2} maxLength={80} placeholder="HANDYO ঢাকা" />
        </Field>
        <Field id="name" label={pick(locale, "নাম (ইংরেজি)", "Name (English)")}>
          <input id="name" name="name" defaultValue={shop?.name} className="field" required minLength={2} maxLength={80} placeholder="HANDYO Dhaka" />
        </Field>
        <Field id="cityBn" label={pick(locale, "শহর / এলাকা (বাংলা)", "City / area (Bangla)")} hint={pick(locale, "কাস্টমার দেখবে: শুধু <শহর>", "Customers see: <city> only")}>
          <input id="cityBn" name="cityBn" defaultValue={shop?.cityBn} className="field" required minLength={2} maxLength={80} placeholder="ঢাকা" />
        </Field>
        <Field id="city" label={pick(locale, "শহর / এলাকা (ইংরেজি)", "City / area (English)")}>
          <input id="city" name="city" defaultValue={shop?.city} className="field" required minLength={2} maxLength={80} placeholder="Dhaka" />
        </Field>
        <div className="sm:col-span-2">
          <p className="label">{pick(locale, "ধরন", "Kind")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm">
              <input type="radio" name="kind" value="BRANCH" defaultChecked={(shop?.kind ?? "BRANCH") === "BRANCH"} className="mt-0.5 size-4 accent-[var(--brand)]" />
              <span><span className="block font-bold text-ink">{pick(locale, "আমাদের শাখা", "Our branch")}</span><span className="block text-xs text-muted-foreground">{pick(locale, "HANDYO-র নিজের অফিস ও কর্মী", "HANDYO's own office and workers")}</span></span>
            </label>
            <label className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm">
              <input type="radio" name="kind" value="PARTNER" defaultChecked={shop?.kind === "PARTNER"} className="mt-0.5 size-4 accent-[var(--brand)]" />
              <span><span className="block font-bold text-ink">{pick(locale, "পার্টনার শপ (যেমন রেস্টুরেন্ট, দোকান)", "Partner shop (e.g. restaurant, store)")}</span><span className="block text-xs text-muted-foreground">{pick(locale, "অন্য ব্যবসা, আমাদের প্ল্যাটফর্মে নিজের শপ চালায়", "An independent business running its own shop on our platform")}</span></span>
            </label>
          </div>
        </div>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <h3 className="display text-base font-extrabold text-ink sm:col-span-2">{pick(locale, "যোগাযোগ", "Contact")}</h3>
        <Field id="phone" label={pick(locale, "ফোন / হেল্পলাইন", "Phone / helpline")}>
          <input id="phone" name="phone" defaultValue={shop?.phone} className="field" maxLength={30} placeholder="01XXXXXXXXX" />
        </Field>
        <Field id="whatsapp" label={pick(locale, "হোয়াটসঅ্যাপ", "WhatsApp")}>
          <input id="whatsapp" name="whatsapp" defaultValue={shop?.whatsapp} className="field" maxLength={30} placeholder="01XXXXXXXXX" />
        </Field>
        <Field id="email" label={pick(locale, "ইমেইল", "Email")}>
          <input id="email" name="email" type="email" defaultValue={shop?.email} className="field" placeholder="shop@example.com" />
        </Field>
        <div className="hidden sm:block" />
        <Field id="addressBn" label={pick(locale, "ঠিকানা (বাংলা)", "Address (Bangla)")}>
          <input id="addressBn" name="addressBn" defaultValue={shop?.addressBn} className="field" maxLength={200} />
        </Field>
        <Field id="address" label={pick(locale, "ঠিকানা (ইংরেজি)", "Address (English)")}>
          <input id="address" name="address" defaultValue={shop?.address} className="field" maxLength={200} />
        </Field>
        <Field id="blurbBn" label={pick(locale, "এক লাইনে শপ (বাংলা)", "One-liner (Bangla)")}>
          <textarea id="blurbBn" name="blurbBn" defaultValue={shop?.blurbBn} className="field min-h-16" maxLength={300} />
        </Field>
        <Field id="blurb" label={pick(locale, "এক লাইনে শপ (ইংরেজি)", "One-liner (English)")}>
          <textarea id="blurb" name="blurb" defaultValue={shop?.blurb} className="field min-h-16" maxLength={300} />
        </Field>
      </div>

      {!editing ? (
        <>
          <div className="card grid gap-3 p-4">
            <h3 className="display text-base font-extrabold text-ink">{pick(locale, "সেবা ও দাম কপি করুন", "Copy services & prices")}</h3>
            <Field id="copyFrom" label={pick(locale, "কোন শপ থেকে", "From which shop")} hint={pick(locale, "ক্যাটাগরি, সাব-সার্ভিস, দাম, রিপ্লাই টেমপ্লেট আর সেটিংস কপি হবে। পরে এই শপে আলাদা করে বদলাতে পারবেন।", "Categories, sub-services, prices, reply templates and settings get copied. You can change them separately in the new shop afterwards.")}>
              <select id="copyFrom" name="copyFrom" defaultValue={defaultCopyFrom ?? shops[0]?.id ?? ""} className="field">
                {shops.map((s) => <option key={s.id} value={s.id}>{pick(locale, s.nameBn, s.name)}</option>)}
                <option value="">{pick(locale, "খালি রাখুন", "Start empty")}</option>
              </select>
            </Field>
          </div>

          <div className="card grid gap-3 p-4">
            <h3 className="display text-base font-extrabold text-ink">{pick(locale, "এলাকা (প্রতি লাইনে একটা)", "Areas (one per line)")}</h3>
            <Field id="areasText" label={pick(locale, "slug | ইংরেজি | বাংলা | ভিজিট চার্জ", "slug | English | Bangla | visit charge")} hint={pick(locale, "অন্তত একটা এলাকা লাগবে। পরে এলাকা পেজ থেকে যোগ/এডিট করা যাবে।", "At least one area is needed. You can add or edit areas later on the Areas page.")}>
              <textarea id="areasText" name="areasText" className="field min-h-32 font-mono text-sm" required placeholder={"dhanmondi | Dhanmondi | ধানমন্ডি | 0\ngulshan | Gulshan | গুলশান | 50\nuttara | Uttara | উত্তরা | 80"} />
            </Field>
          </div>

          <div className="card grid gap-3 p-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <h3 className="display text-base font-extrabold text-ink">{pick(locale, "প্রথম শপ অ্যাডমিন (ঐচ্ছিক)", "First shop admin (optional)")}</h3>
              <p className="text-xs text-muted-foreground">{pick(locale, "এই অ্যাকাউন্ট শুধু এই শপের অ্যাডমিন হবে। পরে স্টাফ পেজ থেকেও যোগ করা যায়।", "This account will be an admin of this shop only. You can also add staff later from the Staff page.")}</p>
            </div>
            <Field id="adminName" label={pick(locale, "নাম", "Name")}>
              <input id="adminName" name="adminName" className="field" maxLength={80} />
            </Field>
            <Field id="adminEmail" label={pick(locale, "ইমেইল (লগইন)", "Email (login)")}>
              <input id="adminEmail" name="adminEmail" type="email" className="field" autoComplete="off" />
            </Field>
            <Field id="adminPassword" label={pick(locale, "পাসওয়ার্ড (৬+)", "Password (6+)")}>
              <input id="adminPassword" name="adminPassword" type="password" className="field" minLength={6} autoComplete="new-password" />
            </Field>
          </div>
        </>
      ) : null}

      <SubmitButton className="btn-primary h-11 w-full sm:w-auto sm:px-6">{editing ? pick(locale, "শপ সেভ করুন", "Save shop") : pick(locale, "শপ তৈরি করুন", "Create shop")}</SubmitButton>
    </ActionForm>
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
