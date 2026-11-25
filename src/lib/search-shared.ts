import type { Locale } from "./format"

/** Types and pure helpers shared by the server search and the client search box (no DB imports here). */

export type HitKind = "category" | "offering" | "product" | "vehicle" | "stay"

export type Hit = {
  kind: HitKind
  id: string
  title: string
  titleBn: string
  sub: string
  subBn: string
  price: string
  priceBn: string
  href: string
  image: string
  score: number
}

export function hitTitle(h: Hit, locale: Locale) {
  return locale === "bn" ? h.titleBn || h.title : h.title || h.titleBn
}
export function hitSub(h: Hit, locale: Locale) {
  return locale === "bn" ? h.subBn || h.sub : h.sub || h.subBn
}
export function hitPrice(h: Hit, locale: Locale) {
  return locale === "bn" ? h.priceBn : h.price
}

export const KIND_TEXT: Record<HitKind, { bn: string; en: string }> = {
  category: { bn: "সেবা", en: "Service" },
  offering: { bn: "সার্ভিস", en: "Service" },
  product: { bn: "পণ্য", en: "Product" },
  vehicle: { bn: "গাড়ি", en: "Vehicle" },
  stay: { bn: "রিসোর্ট", en: "Resort" },
}
