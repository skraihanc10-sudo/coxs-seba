import type { Metadata } from "next"
import Link from "next/link"
import { getLocale } from "@/lib/auth"
import { currentShop } from "@/lib/shops"
import { pick } from "@/lib/i18n"
import { pageMeta } from "@/lib/seo"
import { PageHeader } from "@/components/bits"
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld"

export async function generateMetadata(): Promise<Metadata> {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  return pageMeta({
    locale,
    title: pick(locale, "কীভাবে কাজ করে", "How it works"),
    description: pick(
      locale,
      `চার ধাপে ঘরের সেবা: সেবা বাছুন, ${shop.cityBn} এলাকায় ঠিকানা আর সময় দিন, যাচাই করা কর্মী আসবেন, কাজ শেষে ক্যাশ, বিকাশ বা নগদে দিন।`,
      `Home services in four steps: pick a service, add your ${shop.city} address and time, a verified worker comes, pay cash, bKash or Nagad when it's done.`,
    ),
    path: "/how-it-works",
  })
}

export default async function HowItWorksPage() {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  const steps = [
    [pick(locale, "১. সেবা বেছে নিন", "1. Pick a service"), pick(locale, "লন্ড্রি, ইলেকট্রিশিয়ান, প্লাম্বার, ক্লিনিং, এসি, শিফটিং, গাড়ি-বাইক ভাড়া বা যেকোনো ছোট কাজ। বেশিরভাগ সেবার দাম আগেই লেখা থাকে, আর অপশন বাছার সাথে সাথে আনুমানিক দাম দেখবেন।", "Laundry, electrician, plumber, cleaning, AC, moving, car & bike rental or any small job. Most prices are listed, and the estimate updates as you choose options.")],
    [pick(locale, "২. ঠিকানা আর সময় দিন", "2. Add address and time"), pick(locale, `${shop.cityBn} এলাকা, বাড়ির ঠিকানা আর একটা ২–৩ ঘণ্টার স্লট বেছে নিন। লগইন লাগে না: মোবাইল নম্বরে একটা কোড আসবে, সেটা দিলেই বুকিং হয়ে যাবে।`, `Choose your ${shop.city} area, address and a 2–3 hour slot. No login needed: we text a code to your mobile and the booking is done.`)],
    [pick(locale, "৩. কর্মী আসবেন, কাজ হবে", "3. The worker comes and does the job"), pick(locale, "অফিস থেকে একজন যাচাই করা কর্মী ঠিক করা হয়। অ্যাপে দেখবেন কর্মীর নাম, ছবি আর ফোন, আর তিনি কখন রওনা দিলেন ও পৌঁছালেন। যেসব কাজে আগে দেখা দরকার, কর্মী দেখে দাম পাঠাবেন; আপনি মানলে তবেই কাজ শুরু।", "The office assigns a verified worker. You see their name, photo and phone, and when they leave and arrive. For inspection jobs the worker sends a quote first; work starts only when you accept.")],
    [pick(locale, "৪. কাজ শেষে টাকা দিন", "4. Pay when it's done"), pick(locale, "ক্যাশ, বিকাশ বা নগদ। তারপর রেটিং দিয়ে জানান কেমন লাগল, এতে আমাদের টিম ভালো হয়।", "Cash, bKash or Nagad. Then rate the job so our team keeps improving.")],
  ]
  return (
    <div className="mx-auto max-w-2xl">
      <JsonLd data={breadcrumbs([{ name: "HANDYO", path: "/" }, { name: pick(locale, "কীভাবে কাজ করে", "How it works"), path: "/how-it-works" }])} />
      <PageHeader back="/" title={pick(locale, "কীভাবে কাজ করে", "How it works")} sub={pick(locale, `${shop.cityBn} এলাকায় ঘরের সেবা, চার ধাপে।`, `Home services in ${shop.city}, in four steps.`)} />
      <ol className="relative space-y-3 before:absolute before:top-6 before:bottom-6 before:left-[2.1rem] before:w-px before:bg-line md:before:left-[2.35rem]">
        {steps.map(([title, body], i) => (
          <li key={title} className="card card-lift relative flex gap-4 p-4 md:p-5">
            <span className="step-dot" aria-hidden>{i + 1}</span>
            <div className="min-w-0">
              <h2 className="display text-lg font-extrabold text-ink">{title.replace(/^[০-৯0-9]+\.\s*/, "")}</h2>
              <p className="mt-1.5 text-[15px] text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/services" className="btn-primary mt-6 w-full">{pick(locale, "সেবা দেখুন", "See services")}</Link>
    </div>
  )
}
