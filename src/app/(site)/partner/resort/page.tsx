import type { Metadata } from "next"
import Link from "next/link"
import { BadgeCheck, CalendarCheck, LayoutDashboard, MessageCircle } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { currentShop } from "@/lib/shops"
import { activeAreas } from "@/lib/catalog"
import { pick } from "@/lib/i18n"
import { pageMeta } from "@/lib/seo"
import { stayCategory } from "@/lib/stays"
import { stayPartnerApplyAction } from "@/actions/stays"
import { PageHeader } from "@/components/bits"
import { ActionForm, SubmitButton } from "@/components/forms"
import { PropertyFields } from "@/components/partner/property-form"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"

export async function generateMetadata(): Promise<Metadata> {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  return pageMeta({
    locale,
    title: pick(locale, "রিসোর্ট বা হোটেল লিস্ট করুন · পার্টনার হোন", "List your resort or hotel · Become a partner"),
    description: pick(locale, `${shop.cityBn} এলাকায় আপনার রিসোর্ট, হোটেল বা কটেজ HANDYO-তে লিস্ট করুন। রুম আর দাম আপনি ঠিক করেন; বুকিং, চ্যাট আর কাস্টমার আমরা আনি।`, `List your resort, hotel or cottage in ${shop.city} on HANDYO. You set rooms and prices; we bring bookings, chat and customers.`),
    path: "/partner/resort",
  })
}

export default async function ResortPartnerPage() {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  const [category, areas] = await Promise.all([stayCategory(shop.id), activeAreas(shop.id)])
  const benefits = [
    { icon: CalendarCheck, title: pick(locale, "রুম আর দাম আপনার হাতে", "Rooms and prices are yours"), body: pick(locale, "কয়টা রুম, কত দাম, কবে বন্ধ – সব আপনি ঠিক করেন। ওভারবুকিং হয় না, আমরা রুমসংখ্যা ধরে হিসাব রাখি।", "How many rooms, what price, when to pause: your call. No overbooking; we count against your room total.") },
    { icon: MessageCircle, title: pick(locale, "বুকিং, চ্যাট আর কাস্টমার আমরা আনি", "We bring bookings, chat and customers"), body: pick(locale, "কাস্টমার HANDYO-তে বুক করে, আপনি নিশ্চিত করেন, চেক-ইনের আগে চ্যাটে সব ঠিক হয়।", "Customers book on HANDYO, you confirm, and details are settled in chat before check-in.") },
    { icon: LayoutDashboard, title: pick(locale, "অনুমোদনের পর নিজের প্যানেল", "Your own panel once approved"), body: pick(locale, "বুকিং, আয় আর রিসোর্টের তথ্য এক জায়গায়, মোবাইল থেকেই।", "Bookings, earnings and your listing in one place, from your phone.") },
  ]
  const steps = [
    pick(locale, "নিচের ফর্মে রিসোর্টের তথ্য, রুম আর দাম দিন (ছবিসহ)", "Fill in the property, rooms and prices below (with photos)"),
    pick(locale, "অ্যাডমিন যাচাই করে অনুমোদন দেন", "Admin checks and approves"),
    pick(locale, "বুকিং এলে প্যানেলে আর নোটিশে দেখবেন, এক ক্লিকে নিশ্চিত করুন", "Bookings arrive in your panel and as alerts; confirm in one click"),
    pick(locale, "গেস্ট চেক-ইন, চেক-আউট – আয় প্যানেলে", "Guest checks in and out; earnings show in your panel"),
  ]
  return (
    <div className="mx-auto max-w-2xl">
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "পার্টনার হোন", "Become a partner"), path: "/partner" }, { name: pick(locale, "রিসোর্ট", "Resort"), path: "/partner/resort" }])} />
      <PageHeader back="/services/resort-booking" title={pick(locale, "রিসোর্ট বা হোটেল লিস্ট করুন", "List your resort or hotel")} sub={pick(locale, `${shop.cityBn} এলাকায় আপনার রিসোর্ট, হোটেল বা কটেজ HANDYO-র মাধ্যমে বুকিং নিন।`, `Take bookings for your resort, hotel or cottage in ${shop.city} through HANDYO.`)} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {benefits.map((b) => (
          <section key={b.title} className="card p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden><b.icon className="size-5" /></span>
            <h2 className="mt-3 font-extrabold text-ink">{b.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
          </section>
        ))}
      </div>
      <section className="card mt-4 p-4 md:p-5">
        <h2 className="display text-lg font-extrabold text-ink">{pick(locale, "কীভাবে কাজ করে", "How it works")}</h2>
        <ol className="mt-3 space-y-2">
          {steps.map((s, i) => (
            <li key={s} className="flex items-start gap-3 text-[15px]">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-white">{i + 1}</span>
              <span className="text-ink">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">{pick(locale, "গাড়ি বা বাইক ভাড়া দিতে চান?", "Want to rent out a vehicle instead?")} <Link href="/partner" className="font-bold text-brand">{pick(locale, "গাড়ির পার্টনার হোন →", "Vehicle partner →")}</Link></p>
      </section>
      <section className="mt-6">
        <h2 className="display text-xl font-extrabold text-ink">{pick(locale, "আবেদন করুন", "Apply")}</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">{pick(locale, "অনুমোদনের পর এই মোবাইল নম্বর আর পাসওয়ার্ড দিয়েই লগইন করবেন।", "Once approved you log in with this mobile number and password.")}</p>
        {!category || !areas.length ? (
          <div className="card px-6 py-10 text-center">
            <p className="font-extrabold text-ink">{pick(locale, `${shop.nameBn} শাখায় এখনো রিসোর্ট বুকিং চালু হয়নি`, `${shop.name} branch has no resort booking yet`)}</p>
            <Link href="/branches" className="btn-soft mt-4 inline-flex">{pick(locale, "শাখা দেখুন", "See branches")}</Link>
          </div>
        ) : (
          <ActionForm action={stayPartnerApplyAction} resetOnSuccess={false} className="card space-y-3 p-4 md:p-5">
            <h3 className="text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "আপনার তথ্য", "About you")}</h3>
            <div><label className="label">{pick(locale, "নাম", "Name")}</label><input name="ownerName" className="field" required minLength={2} maxLength={80} autoComplete="name" /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label">{pick(locale, "মোবাইল (লগইনে লাগবে)", "Mobile (used to log in)")}</label><input name="phone" type="tel" inputMode="tel" className="field" required placeholder="01XXXXXXXXX" autoComplete="tel" /></div>
              <div><label className="label">{pick(locale, "ইমেইল (ঐচ্ছিক)", "Email (optional)")}</label><input name="email" type="email" className="field" autoComplete="email" /></div>
            </div>
            <div><label className="label">{pick(locale, "পাসওয়ার্ড (অন্তত ৬ অক্ষর)", "Password (at least 6 characters)")}</label><input name="password" type="password" className="field" required minLength={6} maxLength={100} autoComplete="new-password" /></div>
            <h3 className="pt-2 text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "রিসোর্ট / হোটেলের তথ্য", "The property")}</h3>
            <PropertyFields locale={locale} property={null} areas={areas} />
            <label className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-3 text-sm text-ink">
              <input type="checkbox" name="agree" required className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
              <span>{pick(locale, "আমি সম্মত: HANDYO প্রতিটা বুকিং থেকে কমিশন রাখে, নিশ্চিত করা বুকিং আমি রাখব, আর রিসোর্টের তথ্য ও ছবি সঠিক।", "I agree: HANDYO keeps a commission on each booking, I honour confirmed bookings, and the listing and photos are accurate.")}</span>
            </label>
            <SubmitButton><BadgeCheck className="size-4" /> {pick(locale, "আবেদন জমা দিন", "Submit application")}</SubmitButton>
            <p className="text-center text-xs text-muted-foreground">{pick(locale, "অনুমোদনের পর লগইন: ", "After approval, log in at: ")}<Link href="/login?tab=staff" className="font-bold text-brand">/login?tab=staff</Link></p>
          </ActionForm>
        )}
      </section>
    </div>
  )
}
