import type { Metadata } from "next"
import Link from "next/link"
import { BadgeCheck, FileCheck, LayoutDashboard, ShieldCheck, Upload } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { currentShop } from "@/lib/shops"
import { activeCategories } from "@/lib/catalog"
import { ID_TYPES, PARTNER_FLOWS } from "@/lib/partners"
import { named, pick } from "@/lib/i18n"
import { pageMeta } from "@/lib/seo"
import { partnerSignupAction } from "@/actions/partners"
import { PageHeader } from "@/components/bits"
import { CategoryIcon } from "@/components/category-icon"
import { ActionForm, SubmitButton } from "@/components/forms"
import { DocumentDrop } from "@/components/document-drop"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"

export async function generateMetadata(): Promise<Metadata> {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  return pageMeta({
    locale,
    title: pick(locale, "HANDYO পার্টনার হোন · দোকান, গাড়ি, রিসোর্ট, লন্ড্রি", "Become a HANDYO partner · store, vehicle, resort, laundry"),
    description: pick(
      locale,
      `${shop.cityBn}-এ আপনার দোকান, গাড়ি, রিসোর্ট বা লন্ড্রি HANDYO-তে যুক্ত করুন। অ্যাকাউন্ট খুলুন, অফিস অনুমোদন দিলে নিজের প্যানেল থেকে ছবি আর দাম দিয়ে সব যোগ করুন।`,
      `Bring your store, vehicle, resort or laundry in ${shop.city} to HANDYO. Open an account; once the office approves, add everything with photos and prices from your own panel.`,
    ),
    path: "/partner",
  })
}

/**
 * One sign-up for every kind of partner: who you are (with ID papers) and what
 * you will offer. Vehicles, rooms, products and prices are added from the
 * partner panel after the office approves the person.
 */
export default async function PartnerPage() {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  const categories = (await activeCategories(shop.id)).filter((c) => PARTNER_FLOWS.includes(c.flow))
  const bn = locale === "bn"
  const steps = [
    { icon: FileCheck, title: pick(locale, "১. অ্যাকাউন্ট খুলুন", "1. Open an account"), body: pick(locale, "নাম, মোবাইল, পাসওয়ার্ড, পরিচয়পত্র (NID / পাসপোর্ট) আর কী দেবেন সেটা বেছে নিন। ২ মিনিট।", "Name, mobile, password, your ID (NID / passport) and what you will offer. Two minutes.") },
    { icon: ShieldCheck, title: pick(locale, "২. অফিস যাচাই করে", "2. The office verifies"), body: pick(locale, "HANDYO অফিস কাগজ দেখে অনুমোদন দেয়; তারপর এই নম্বর আর পাসওয়ার্ড দিয়ে লগইন।", "The HANDYO office checks the papers and approves; then log in with this number and password.") },
    { icon: Upload, title: pick(locale, "৩. ছবি আর দাম দিয়ে যোগ করুন", "3. Add with photos and prices"), body: pick(locale, "নিজের প্যানেলে ক্যাটাগরি অনুযায়ী পণ্য, গাড়ি, রুম বা কাপড়ের দাম তুলুন; অফিস অনুমোদন দিলেই সাইটে দেখাবে।", "In your panel, list products, vehicles, rooms or laundry prices; each goes live once the office approves.") },
    { icon: LayoutDashboard, title: pick(locale, "৪. অর্ডার, চ্যাট, হিসাব", "4. Orders, chat, ledger"), body: pick(locale, "অর্ডার আপনার প্যানেলে আর নোটিশে আসে; কাস্টমারের সাথে চ্যাট; হিসাব দেখুন; ২ জন হেল্পার রাখুন।", "Orders arrive in your panel and as alerts; chat with customers; see your ledger; keep two helpers.") },
  ]
  return (
    <div className="mx-auto max-w-2xl">
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "পার্টনার হোন", "Become a partner"), path: "/partner" }])} />
      <PageHeader back="/" title={pick(locale, "HANDYO পার্টনার হোন", "Become a HANDYO partner")} sub={pick(locale, `${shop.cityBn}-এ আপনার দোকান, গাড়ি, রিসোর্ট বা লন্ড্রি HANDYO-তে। আপনি দাম ঠিক করেন, বিক্রির ৯০% আপনার।`, `Your store, vehicle, resort or laundry in ${shop.city}, on HANDYO. You set the prices and keep 90% of every sale.`)} />

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.title} className="card p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden><s.icon className="size-5" /></span>
            <h2 className="mt-3 font-extrabold text-ink">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      <section className="mt-6">
        <h2 className="display text-xl font-extrabold text-ink">{pick(locale, "অ্যাকাউন্ট খুলুন", "Open your account")}</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">{pick(locale, "গাড়ি, পণ্য বা রুমের তথ্য এখন লাগবে না; অনুমোদনের পর প্যানেল থেকে দেবেন।", "No vehicle, product or room details now; you add those from the panel after approval.")}</p>
        {!categories.length ? (
          <div className="card px-6 py-10 text-center">
            <p className="font-extrabold text-ink">{pick(locale, `${shop.nameBn} শাখায় এখনো পার্টনার নেওয়া হচ্ছে না`, `${shop.name} branch is not taking partners yet`)}</p>
            <Link href="/branches" className="btn-soft mt-4 inline-flex">{pick(locale, "শাখা দেখুন", "See branches")}</Link>
          </div>
        ) : (
          <ActionForm action={partnerSignupAction} resetOnSuccess={false} className="card space-y-3 p-4 md:p-5">
            <h3 className="text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "কী দেবেন", "What you will offer")}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={pick(locale, "ক্যাটাগরি", "Category")}>
              {categories.map((c, i) => (
                <label key={c.id} className="card flex cursor-pointer flex-col items-center gap-1.5 px-2 py-3 text-center text-xs font-extrabold text-ink transition has-[:checked]:bg-brand has-[:checked]:text-white has-[:checked]:ring-brand hover:ring-brand/40">
                  <input type="radio" name="categoryId" value={c.id} defaultChecked={i === 0} className="sr-only" required />
                  <CategoryIcon name={c.icon} className="size-6" />
                  {named(locale, c)}
                </label>
              ))}
            </div>
            <div><label className="label" htmlFor="businessName">{pick(locale, "ব্যবসা / দোকানের নাম (ঐচ্ছিক)", "Business / store name (optional)")}</label><input id="businessName" name="businessName" className="field" maxLength={100} placeholder={pick(locale, "যেমন: সাগর শুঁটকি ঘর", "e.g. Sagor Dried Fish House")} /></div>

            <h3 className="pt-2 text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "আপনার তথ্য", "About you")}</h3>
            <div><label className="label" htmlFor="name">{pick(locale, "পুরো নাম (পরিচয়পত্র অনুযায়ী)", "Full name (as on the ID)")}</label><input id="name" name="name" className="field" required minLength={2} maxLength={80} autoComplete="name" /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="phone">{pick(locale, "মোবাইল (লগইনে লাগবে)", "Mobile (used to log in)")}</label><input id="phone" name="phone" type="tel" inputMode="tel" className="field" required placeholder="01XXXXXXXXX" autoComplete="tel" /></div>
              <div><label className="label" htmlFor="email">{pick(locale, "ইমেইল (ঐচ্ছিক)", "Email (optional)")}</label><input id="email" name="email" type="email" className="field" autoComplete="email" /></div>
            </div>
            <div><label className="label" htmlFor="password">{pick(locale, "পাসওয়ার্ড (অন্তত ৬ অক্ষর)", "Password (at least 6 characters)")}</label><input id="password" name="password" type="password" className="field" required minLength={6} maxLength={100} autoComplete="new-password" /></div>

            <h3 className="pt-2 text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "পরিচয়পত্র", "Identity papers")}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="idType">{pick(locale, "ধরন", "Type")}</label>
                <select id="idType" name="idType" className="field" required defaultValue="NID">
                  {Object.entries(ID_TYPES).map(([k, v]) => <option key={k} value={k}>{bn ? v.bn : v.en}</option>)}
                </select>
              </div>
              <div><label className="label" htmlFor="idNumber">{pick(locale, "নম্বর", "Number")}</label><input id="idNumber" name="idNumber" className="field" required minLength={5} maxLength={40} inputMode="numeric" placeholder={pick(locale, "NID / পাসপোর্ট নম্বর", "NID / passport number")} /></div>
            </div>
            <DocumentDrop
              name="idPhotos"
              label={pick(locale, "পরিচয়পত্রের ছবি বা PDF (সামনে ও পেছনে, সর্বোচ্চ ২টা)", "Photo or PDF of the ID (front and back, up to 2)")}
              hint={pick(locale, "ছবি তুলুন বা ফাইল বেছে নিন · JPG, PNG বা PDF · প্রতিটা ৫ MB-এর কম", "Take a photo or choose a file · JPG, PNG or PDF · under 5 MB each")}
              note={pick(locale, "শুধু HANDYO অফিস দেখবে; সাইটে কখনো দেখানো হয় না।", "Seen only by the HANDYO office; never shown on the site.")}
              choose={pick(locale, "ছবি / PDF দিন", "Add photo / PDF")}
              empty={pick(locale, "এখনো কোনো ফাইল নেই", "No file chosen yet")}
            />

            <label className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-3 text-sm text-ink">
              <input type="checkbox" name="agree" required className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
              <span>{pick(locale, "আমি সম্মত: HANDYO প্রতিটা বিক্রি বা ভাড়া থেকে ১০% রাখে, কাস্টমার HANDYO-র মাধ্যমে বুক করে ও টাকা দেয়, আর আমার দেওয়া তথ্য ও কাগজ সঠিক।", "I agree: HANDYO keeps 10% of every sale or rental, customers book and pay through HANDYO, and the details and papers I give are genuine.")}</span>
            </label>
            <SubmitButton><BadgeCheck className="size-4" /> {pick(locale, "আবেদন জমা দিন", "Submit application")}</SubmitButton>
            <p className="text-center text-xs text-muted-foreground">
              {pick(locale, "অনুমোদনের পর লগইন: ", "After approval, log in at: ")}<Link href="/login?tab=staff" className="font-bold text-brand">/login?tab=staff</Link>{pick(locale, " (মোবাইল + পাসওয়ার্ড)", " (mobile + password)")}
            </p>
          </ActionForm>
        )}
      </section>
    </div>
  )
}
