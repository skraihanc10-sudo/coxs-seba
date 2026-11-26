import type { Metadata } from "next"
import type { Locale } from "./format"

/** Canonical origin of the public site. Set SITE_URL (or AUTH_URL) in production. */
export const SITE_URL = (process.env.SITE_URL || process.env.AUTH_URL || "https://handyo.bd").replace(/\/+$/, "")

export const SITE_NAME = "HANDYO"

/** Search keywords, Bangla and English, shared by every indexable page. */
export const SITE_KEYWORDS = [
  "হোম সার্ভিস কক্সবাজার",
  "লন্ড্রি কক্সবাজার",
  "ইলেকট্রিশিয়ান কক্সবাজার",
  "প্লাম্বার কক্সবাজার",
  "এসি সার্ভিসিং কক্সবাজার",
  "হোম ক্লিনিং",
  "গাড়ি ভাড়া কক্সবাজার",
  "বাইক ভাড়া কক্সবাজার",
  "মেরিন ড্রাইভ জিপ",
  "হোম সার্ভিস ঢাকা",
  "home services Cox's Bazar",
  "laundry Cox's Bazar",
  "electrician Cox's Bazar",
  "plumber Cox's Bazar",
  "AC service Cox's Bazar",
  "home cleaning Bangladesh",
  "rent a car Cox's Bazar",
  "bike rental Cox's Bazar",
  "Marine Drive jeep tour",
  "home services Dhaka",
  "সেন্ট মার্টিন শিপ টিকিট",
  "সেন্ট মার্টিন জাহাজ টিকিট দাম",
  "কর্ণফুলী এক্সপ্রেস টিকিট",
  "বে ওয়ান শিপ টিকিট",
  "কক্সবাজার টু সেন্ট মার্টিন শিপ",
  "রিসোর্ট বুকিং কক্সবাজার",
  "হোটেল বুকিং কক্সবাজার",
  "কক্সবাজার হোটেল",
  "কটেজ ভাড়া কক্সবাজার",
  "কক্সবাজারের শুঁটকি",
  "শুঁটকি অনলাইন অর্ডার",
  "লইট্টা শুঁটকি",
  "ছুরি শুঁটকি",
  "বালাচাও",
  "আচার অনলাইন",
  "বার্মিজ আচার",
  "চান্দের গাড়ি ভাড়া",
  "চান্দের গাড়ি কক্সবাজার",
  "রেন্ট এ কার কক্সবাজার",
  "স্কুটার ভাড়া কক্সবাজার",
  "লন্ড্রি সার্ভিস",
  "ড্রাই ক্লিনিং কক্সবাজার",
  "এসি মেরামত",
  "ফ্রিজ মেরামত",
  "ইলেকট্রিশিয়ান",
  "প্লাম্বার",
  "বাসা পরিষ্কার",
  "কাজের লোক",
  "দৈনিক শ্রমিক",
  "কক্সবাজার সার্ভিস",
  "কক্সবাজার অনলাইন সার্ভিস",
  "পার্টনার হোন",
  "Saint Martin ship ticket",
  "Saint Martin ship ticket price",
  "Karnafuly Express ticket",
  "Bay One ship ticket",
  "Cox's Bazar to Saint Martin ship",
  "resort booking Cox's Bazar",
  "hotel booking Cox's Bazar",
  "Cox's Bazar hotels",
  "cottage rental Cox's Bazar",
  "Cox's Bazar dried fish",
  "shutki online order",
  "loitta shutki",
  "churi shutki",
  "balachao",
  "pickle online Bangladesh",
  "Burmese achar",
  "chander gari rent",
  "chander gari Cox's Bazar",
  "scooter rental Cox's Bazar",
  "laundry service",
  "dry cleaning Cox's Bazar",
  "AC repair Cox's Bazar",
  "fridge repair Cox's Bazar",
  "house cleaning Cox's Bazar",
  "day labour Cox's Bazar",
  "Cox's Bazar services",
  "Cox's Bazar online service",
  "become a partner",
  "HANDYO",
  "Handyo BD",
  "handyo.bd",
]

/** Keywords for one service category page: its names, every offering, and the city in both languages. */
export function categoryKeywords(category: { name: string; nameBn: string; offerings: Array<{ name: string; nameBn: string }> }, city: { bn: string; en: string }) {
  const out = new Set<string>()
  for (const n of [category.nameBn, category.name]) {
    out.add(n)
    out.add(`${n} ${city.bn}`)
    out.add(`${n} ${city.en}`)
    out.add(`${n} দাম`)
    out.add(`${n} price`)
    out.add(`${n} online`)
  }
  for (const o of category.offerings) {
    out.add(o.nameBn)
    out.add(o.name)
    out.add(`${o.nameBn} দাম`)
    out.add(`${o.name} price`)
  }
  return [...out, ...SITE_KEYWORDS]
}

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString()
}

export type PageMetaInput = {
  locale: Locale
  title: string
  description: string
  /** Path starting with "/", used for the canonical and og:url. */
  path: string
  noindex?: boolean
  /** Override the og image; defaults to the site-wide /opengraph-image. */
  image?: string
  keywords?: string[]
}

/** Page metadata in one call: title, description, canonical, Open Graph, Twitter and robots. */
export function pageMeta({ locale, title, description, path, noindex = false, image = "/opengraph-image", keywords }: PageMetaInput): Metadata {
  const url = absoluteUrl(path)
  const robots: Metadata["robots"] = noindex
    ? { index: false, follow: false, googleBot: { index: false, follow: false } }
    : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } }
  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: locale === "bn" ? "bn_BD" : "en_US",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: `${SITE_NAME} · Home services at your door` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    robots,
  }
}

/** Metadata for private, logged-in pages: a title, no indexing, no social preview. */
export function privateMeta(title: string): Metadata {
  return { title, robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }
}

/** Trim to a sensible description length without cutting a word in half. */
export function clip(text: string, max = 155) {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))}…`
}
