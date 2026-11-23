import type { Metadata } from "next"
import Link from "next/link"
import { BadgeCheck, Package, Percent, Store } from "lucide-react"
import { getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { currentShop } from "@/lib/shops"
import { pick } from "@/lib/i18n"
import { pageMeta } from "@/lib/seo"
import { storePartnerApplyAction } from "@/actions/shop"
import { PageHeader } from "@/components/bits"
import { ActionForm, SubmitButton } from "@/components/forms"
import { StoreFields } from "@/components/partner/store-form"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"

export async function generateMetadata(): Promise<Metadata> {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  return pageMeta({
    locale,
    title: pick(locale, "আপনার শুঁটকি বা আচারের দোকান HANDYO-তে · পার্টনার হোন", "Bring your dried-fish or pickle store to HANDYO · Become a partner"),
    description: pick(locale, `${shop.cityBn}-এর শুঁটকি, আচার, চাটনির দোকান HANDYO-তে খুলুন; সারা দেশের অর্ডার, কুরিয়ার, পেমেন্ট আমরা সামলাই। HANDYO মাত্র ১০% রাখে।`, `Open your ${shop.city} dried-fish, pickle or chutney store on HANDYO; we bring nationwide orders and handle courier and payment. HANDYO keeps only 10%.`),
    path: "/partner/store",
  })
}

export default async function StorePartnerPage() {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  const hasShop = await db.serviceCategory.count({ where: { shopId: shop.id, flow: "SHOP", active: true } })
  const benefits = [
    { icon: Store, title: pick(locale, "নিজের দোকানের নামে", "Under your own name"), body: pick(locale, "কাস্টমার আপনার দোকানের নাম দেখে, আপনার পণ্য কিনে। এক দোকানের সব পণ্য এক পার্সেলে।", "Customers see your store name and buy your products. One store's items ship as one parcel.") },
    { icon: Package, title: pick(locale, "অর্ডার সরাসরি আপনার প্যানেলে", "Orders in your own panel"), body: pick(locale, "নতুন অর্ডারের নোটিশ পান, প্যাক করে কুরিয়ারে দিন, ধাপ আপডেট করুন; কাস্টমারের সাথে চ্যাট।", "Get alerts, pack and hand to the courier, update the steps; chat with the customer.") },
    { icon: Percent, title: pick(locale, "HANDYO মাত্র ১০% রাখে", "HANDYO keeps only 10%"), body: pick(locale, "দাম আপনি ঠিক করেন; বিক্রির ৯০% আপনার।", "You set the prices; 90% of every sale is yours.") },
  ]
  return (
    <div className="mx-auto max-w-2xl">
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "পার্টনার হোন", "Become a partner"), path: "/partner" }, { name: pick(locale, "দোকান", "Store"), path: "/partner/store" }])} />
      <PageHeader back="/services/shutki" title={pick(locale, "আপনার দোকান HANDYO-তে খুলুন", "Open your store on HANDYO")} sub={pick(locale, "শুঁটকি, আচার, চাটনি, বালাচাও – কক্সবাজারের দোকান, সারা দেশের কাস্টমার।", "Dried fish, pickles, chutney, balachao: a Cox's Bazar store, customers nationwide.")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {benefits.map((b) => (
          <section key={b.title} className="card p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden><b.icon className="size-5" /></span>
            <h2 className="mt-3 font-extrabold text-ink">{b.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
          </section>
        ))}
      </div>
      <section className="mt-6">
        <h2 className="display text-xl font-extrabold text-ink">{pick(locale, "আবেদন করুন", "Apply")}</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">{pick(locale, "অনুমোদনের পর এই মোবাইল নম্বর আর পাসওয়ার্ড দিয়ে লগইন করে পণ্য যোগ করবেন।", "Once approved, log in with this mobile number and password and add your products.")}</p>
        {!hasShop ? (
          <div className="card px-6 py-10 text-center"><p className="font-extrabold text-ink">{pick(locale, `${shop.nameBn} শাখায় এখনো শপ চালু হয়নি`, `${shop.name} branch has no shop yet`)}</p><Link href="/branches" className="btn-soft mt-4 inline-flex">{pick(locale, "শাখা দেখুন", "See branches")}</Link></div>
        ) : (
          <ActionForm action={storePartnerApplyAction} resetOnSuccess={false} className="card space-y-3 p-4 md:p-5">
            <h3 className="text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "আপনার তথ্য", "About you")}</h3>
            <div><label className="label">{pick(locale, "নাম", "Name")}</label><input name="ownerName" className="field" required minLength={2} maxLength={80} autoComplete="name" /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label">{pick(locale, "মোবাইল (লগইনে লাগবে)", "Mobile (used to log in)")}</label><input name="phone" type="tel" inputMode="tel" className="field" required placeholder="01XXXXXXXXX" autoComplete="tel" /></div>
              <div><label className="label">{pick(locale, "ইমেইল (ঐচ্ছিক)", "Email (optional)")}</label><input name="email" type="email" className="field" autoComplete="email" /></div>
            </div>
            <div><label className="label">{pick(locale, "পাসওয়ার্ড (অন্তত ৬ অক্ষর)", "Password (at least 6 characters)")}</label><input name="password" type="password" className="field" required minLength={6} maxLength={100} autoComplete="new-password" /></div>
            <h3 className="pt-2 text-xs font-extrabold text-muted-foreground uppercase">{pick(locale, "দোকানের তথ্য", "The store")}</h3>
            <StoreFields locale={locale} store={null} />
            <label className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-3 text-sm text-ink">
              <input type="checkbox" name="agree" required className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
              <span>{pick(locale, "আমি সম্মত: HANDYO প্রতিটা বিক্রি থেকে ১০% রাখে, অর্ডার পেলে সময়মতো প্যাক করে কুরিয়ারে দেব, আর পণ্যের মান ও ওজন ঠিক থাকবে।", "I agree: HANDYO keeps 10% of each sale, I pack and ship orders on time, and product quality and weight are as listed.")}</span>
            </label>
            <SubmitButton><BadgeCheck className="size-4" /> {pick(locale, "আবেদন জমা দিন", "Submit application")}</SubmitButton>
          </ActionForm>
        )}
      </section>
    </div>
  )
}
