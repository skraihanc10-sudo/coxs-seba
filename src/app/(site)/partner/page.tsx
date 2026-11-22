import type { Metadata } from "next"
import Link from "next/link"
import { BadgeCheck, LayoutDashboard, MessageCircle, Tag } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { currentShop } from "@/lib/shops"
import { pick } from "@/lib/i18n"
import { pageMeta } from "@/lib/seo"
import { rentalCategory } from "@/lib/vehicles"
import { partnerApplyAction } from "@/actions/vehicles"
import { PageHeader } from "@/components/bits"
import { ActionForm, SubmitButton } from "@/components/forms"
import { VehicleFields } from "@/components/partner/vehicle-form"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"

export async function generateMetadata(): Promise<Metadata> {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  return pageMeta({
    locale,
    title: pick(locale, "গাড়ি ভাড়া দিয়ে আয় করুন · পার্টনার হোন", "Earn by renting out your vehicle · Become a partner"),
    description: pick(
      locale,
      `${shop.cityBn} এলাকায় আপনার গাড়ি, মাইক্রো বা বাইক HANDYO-র মাধ্যমে ভাড়া দিন। আপনি দাম ঠিক করেন, অর্ডার, চ্যাট আর পেমেন্ট আমরা সামলাই।`,
      `Rent out your car, microbus or bike in ${shop.city} through HANDYO. You set the price; we handle orders, chat and payment.`,
    ),
    path: "/partner",
  })
}

export default async function PartnerPage() {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  const category = await rentalCategory(shop.id)
  const offerings = category?.offerings ?? []
  const benefits = [
    { icon: Tag, title: pick(locale, "আপনি দাম ঠিক করেন", "You set the price"), body: pick(locale, "ঘণ্টা বা দিনের ভাড়া আপনার হাতে। যখন খুশি গাড়ি বন্ধ রাখুন বা চালু করুন।", "Hourly or daily rate, your call. Pause or resume the vehicle whenever you like.") },
    { icon: MessageCircle, title: pick(locale, "অর্ডার, চ্যাট আর পেমেন্ট আমরা সামলাই", "We handle orders, chat and payment"), body: pick(locale, "কাস্টমার HANDYO-তে বুক করে আর টাকা দেয়। আপনি শুধু সময়মতো গাড়ি পৌঁছে দেন।", "Customers book and pay through HANDYO. You just bring the vehicle on time.") },
    { icon: LayoutDashboard, title: pick(locale, "অনুমোদনের পর নিজের প্যানেল", "Your own panel once approved"), body: pick(locale, "অর্ডার, আয় আর গাড়ির তালিকা এক জায়গায়, মোবাইল থেকেই।", "Orders, earnings and your vehicles in one place, right from your phone.") },
  ]
  const steps = [
    pick(locale, "নিচের ফর্মে আবেদন করুন (গাড়ির ছবি আর ভাড়া দিন)", "Apply with the form below (photos and rates)"),
    pick(locale, "অ্যাডমিন কাগজ আর গাড়ি দেখে অনুমোদন দেন", "Admin checks the papers and the vehicle, then approves"),
    pick(locale, "অর্ডার এলে আপনার প্যানেলে আর নোটিশে দেখবেন", "Orders arrive in your panel and as alerts"),
    pick(locale, "কাস্টমারের সাথে চ্যাট করুন, গাড়ি পৌঁছে দিন, আয় দেখুন", "Chat with the customer, deliver the vehicle, see your earnings"),
  ]
  return (
    <div className="mx-auto max-w-2xl">
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "পার্টনার হোন", "Become a partner"), path: "/partner" }])} />
      <PageHeader back="/" title={pick(locale, "গাড়ি ভাড়া দিয়ে আয় করুন", "Earn by renting out your vehicle")} sub={pick(locale, `${shop.cityBn} এলাকায় আপনার গাড়ি, মাইক্রো বা বাইক HANDYO-র মাধ্যমে ভাড়া দিন।`, `Rent out your car, microbus or bike in ${shop.city} through HANDYO.`)} />

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
      </section>

      <section className="mt-6">
        <h2 className="display text-xl font-extrabold text-ink">{pick(locale, "আবেদন করুন", "Apply")}</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">{pick(locale, "৫ মিনিট লাগবে। অনুমোদনের পর এই মোবাইল নম্বর আর পাসওয়ার্ড দিয়েই লগইন করবেন।", "Takes 5 minutes. Once approved you log in with this mobile number and password.")}</p>
        {!offerings.length ? (
          <div className="card px-6 py-10 text-center">
            <p className="font-extrabold text-ink">{pick(locale, `${shop.nameBn} শাখায় এখনো ভাড়ার সেবা চালু হয়নি`, `${shop.name} branch has no rental service yet`)}</p>
            <p className="mt-2 text-sm text-muted-foreground">{pick(locale, "অন্য শাখা বেছে নিন বা হেল্পলাইনে কথা বলুন।", "Pick another branch or call the helpline.")}</p>
            <Link href="/branches" className="btn-soft mt-4 inline-flex">{pick(locale, "শাখা দেখুন", "See branches")}</Link>
          </div>
        ) : (
          <ActionForm action={partnerApplyAction} resetOnSuccess={false} className="card space-y-3 p-4 md:p-5">
            <h3 className="text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "আপনার তথ্য", "About you")}</h3>
            <div><label className="label">{pick(locale, "নাম", "Name")}</label><input name="name" className="field" required minLength={2} maxLength={80} autoComplete="name" /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label">{pick(locale, "মোবাইল (লগইনে লাগবে)", "Mobile (used to log in)")}</label><input name="phone" type="tel" inputMode="tel" className="field" required placeholder="01XXXXXXXXX" autoComplete="tel" /></div>
              <div><label className="label">{pick(locale, "ইমেইল (ঐচ্ছিক)", "Email (optional)")}</label><input name="email" type="email" className="field" autoComplete="email" /></div>
            </div>
            <div><label className="label">{pick(locale, "পাসওয়ার্ড (অন্তত ৬ অক্ষর)", "Password (at least 6 characters)")}</label><input name="password" type="password" className="field" required minLength={6} maxLength={100} autoComplete="new-password" /></div>

            <h3 className="pt-2 text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "গাড়ির তথ্য", "The vehicle")}</h3>
            <VehicleFields locale={locale} vehicle={null} offerings={offerings} />

            <label className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-3 text-sm text-ink">
              <input type="checkbox" name="agree" required className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
              <span>{pick(locale, "আমি সম্মত: HANDYO প্রতিটা ভাড়া থেকে কমিশন রাখে, কাস্টমার HANDYO-র মাধ্যমে টাকা দেয়, আর গাড়ি ও কাগজপত্র ঠিক রাখা আমার দায়িত্ব।", "I agree: HANDYO keeps a commission on each rental, customers pay through HANDYO, and keeping the vehicle and its papers in order is my responsibility.")}</span>
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
