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
  "HANDYO",
]

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
