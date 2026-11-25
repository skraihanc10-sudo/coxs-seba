import { taka } from "./format"
import type { Hit, HitKind } from "./search-shared"
export type { Hit, HitKind } from "./search-shared"
import { activeCategories } from "./catalog"
import { liveProducts, priceRange } from "./shop"
import { marketVehicles, photosOf, photoUrl } from "./vehicles"
import { fromNight, marketProperties } from "./stays"
import { unitLabel } from "./pricing"

/**
 * Site-wide search that forgives spelling: Bangla, English and Banglish
 * ("sutki", "শুটকি", "shutki", "dried fish") all find the dried-fish shop.
 *
 * Every searchable thing (category, offering, product, vehicle, resort) is
 * folded into one phonetic key: Bangla letters are transliterated, aspirates
 * and long vowels collapse (kh→k, sh→s, ee→i), doubles collapse, and a
 * consonant skeleton ("sutki" → "stk") lets a dropped vowel still hit. Query
 * tokens then match by prefix, by skeleton, or within a small edit distance.
 */

/* ---------- folding ---------- */

const BN: Record<string, string> = {
  "অ": "o", "আ": "a", "ই": "i", "ঈ": "i", "উ": "u", "ঊ": "u", "ঋ": "ri", "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
  "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri", "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou",
  "ক": "k", "খ": "k", "গ": "g", "ঘ": "g", "ঙ": "n", "চ": "c", "ছ": "c", "জ": "j", "ঝ": "j", "ঞ": "n",
  "ট": "t", "ঠ": "t", "ড": "d", "ঢ": "d", "ণ": "n", "ত": "t", "থ": "t", "দ": "d", "ধ": "d", "ন": "n",
  "প": "p", "ফ": "p", "ব": "b", "ভ": "b", "ম": "m", "য": "j", "র": "r", "ল": "l", "শ": "s", "ষ": "s", "স": "s", "হ": "h",
  "ড়": "r", "ঢ়": "r", "য়": "y", "ৎ": "t", "ং": "n", "ঃ": "", "ঁ": "", "্": "",
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
}

/** Latin-side spelling collapses so Banglish variants meet the transliteration. */
const LATIN: Array<[RegExp, string]> = [
  [/kh|q|ck/g, "k"], [/gh/g, "g"], [/chh|ch/g, "c"], [/jh|z/g, "j"], [/th/g, "t"], [/dh/g, "d"], [/ph|f/g, "p"], [/bh|v|w/g, "b"],
  [/sh|ss/g, "s"], [/x/g, "ks"], [/c(?=[^h]|$)/g, "k"], [/ee|ea|y(?=[^aeiou]|$)/g, "i"], [/oo/g, "u"], [/aa/g, "a"], [/ou|ow|au/g, "ou"],
  [/(?<=[^aeiou])h(?=[^aeiou]|$)/g, ""], [/([a-z0-9])\1+/g, "$1"],
]

/** One phonetic key per word, lower-case latin only. */
export function fold(text: string) {
  let s = text.normalize("NFC").toLowerCase()
  s = s.replace(/ড়|ঢ়|য়/g, (m) => BN[m]).replace(/[ঀ-৿]/g, (ch) => BN[ch] ?? "")
  s = s.replace(/[^a-z0-9\s]+/g, " ")
  for (const [re, to] of LATIN) s = s.replace(re, to)
  return s.replace(/\s+/g, " ").trim()
}

/** Consonant skeleton: "sutki" → "stk". Short words keep their first vowel. */
function skeleton(word: string) {
  const s = word.replace(/(?!^)[aeiou]/g, "")
  return s.length >= 2 ? s : word
}

function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      cur.push(v)
      if (v < best) best = v
    }
    if (best > max) return max + 1
    prev.splice(0, prev.length, ...cur)
  }
  return prev[b.length]
}

/** How well one query token matches one document token: 0 = no. */
function tokenScore(q: string, d: string) {
  if (q === d) return 3
  if (d.startsWith(q)) return 2.4
  if (q.length >= 3 && d.includes(q)) return 1.8
  const sq = skeleton(q), sd = skeleton(d)
  if (sq.length >= 2 && (sq === sd || (sq.length >= 3 && sd.startsWith(sq)))) return 1.6
  const tol = q.length <= 3 ? 0 : q.length <= 6 ? 1 : 2
  if (tol && editDistance(q, d, tol) <= tol) return 1.2
  return 0
}

/* ---------- keywords: what people type for each thing ---------- */

const CATEGORY_WORDS: Record<string, string> = {
  "rent-a-car": "car gari গাড়ি vara bhara ভাড়া rent rental jeep bike motorcycle motor cycle scooter bus microbus hiace noah premio allion chander gari chadergari chad gari চান্দের গাড়ি open roof tour inani himchori marine drive driver trip",
  "resort-booking": "resort hotel room rum রুম থাকা thaka stay cottage kotez guesthouse booking night rat sea view kolatoli laboni himchari vacation family",
  shutki: "shutki sutki dried fish dry fish শুঁটকি loitta churi rupchanda lakkha chingri shrimp balachao balacao bhorta borta",
  achar: "achar acar pickle chutney catni chatni amsotto mango naga roshun garlic chanachur snack chocolate oats nuts",
  laundry: "laundry londri lundry kapor kapor dhoa dhoa wash washing iron istri dry clean blanket kombol kambol curtain porda cloth jama",
  wifi: "wifi internet net broadband router line connection wi-fi",
  electrician: "electric electrician electrician bidyut current fan light bulb wiring switch socket ips meter",
  plumber: "plumber pani water tap kol pipe leak toilet bathroom basin motor pump geyser",
  "home-cleaning": "cleaning clean porishkar poriskar ghor bari home house kitchen sofa deep clean",
  "resort-cleaning": "resort cleaning hotel cleaning housekeeping team crew",
  "ac-fridge": "ac esi air conditioner fridge frij refrigerator freezer gas cooling servicing",
  shifting: "shifting bari bodol basa move moving truck pickup labour furniture",
  labour: "labour labor sromik mistri helper kaj worker daily",
  other: "other onno custom jekono any job kaj help",
}

const GROUP_WORDS: Record<string, string> = {
  shutki: "shutki sutki dried fish শুঁটকি",
  "shutki-achar": "achar pickle shutki achar শুঁটকি আচার",
  "burmese-achar": "burmese achar barmij pickle আচার",
  balachao: "balachao balacao spicy shrimp",
  chatni: "chatni chutney catni naga roshun",
  combo: "combo package gift pack",
  chocolate: "chocolate oats bar snack biscuit",
  "dry-food": "dry food snack nuts badam coconut",
}

const FLOW_HREF: Record<string, boolean> = { RENTAL: true, STAY: true, SHOP: true }

/* ---------- index ---------- */

type Entry = Hit & { own: string[]; ctx: string[] }

const cache = new Map<string, { at: number; rows: Entry[] }>()
const TTL = 60_000

function tokensOf(parts: string[]) {
  return Array.from(new Set(fold(parts.join(" ")).split(" ").filter(Boolean)))
}

async function buildIndex(shopId: string): Promise<Entry[]> {
  const [categories, products, vehicles, properties] = await Promise.all([activeCategories(shopId), liveProducts(shopId), marketVehicles(), marketProperties()])
  const rows: Entry[] = []
  for (const c of categories) {
    rows.push({
      kind: "category", id: c.id, title: c.name, titleBn: c.nameBn, sub: c.blurb, subBn: c.blurbBn, price: "", priceBn: "",
      href: `/services/${c.slug}`, image: c.image, score: 0,
      own: tokensOf([c.name, c.nameBn, c.slug.replace(/-/g, " "), CATEGORY_WORDS[c.slug] ?? ""]), ctx: [],
    })
    if (FLOW_HREF[c.flow]) continue
    for (const o of c.offerings) {
      if (o.slug === "by-item") continue // the hidden per-piece laundry offering books through the cart
      const priceEn = o.pricing === "QUOTE" ? "quote" : `${taka(o.price, "en")}/${unitLabel(o.pricing, "en")}`
      const priceBn = o.pricing === "QUOTE" ? "দেখে দাম" : `${taka(o.price, "bn")}/${unitLabel(o.pricing, "bn")}`
      rows.push({
        kind: "offering", id: o.id, title: o.name, titleBn: o.nameBn, sub: c.name, subBn: c.nameBn, price: priceEn, priceBn,
        href: `/book/${c.slug}/${o.slug}`, image: o.image || c.image, score: 0,
        own: tokensOf([o.name, o.nameBn, o.detail, o.detailBn, o.slug.replace(/-/g, " ")]), ctx: tokensOf([c.name, c.nameBn, CATEGORY_WORDS[c.slug] ?? ""]),
      })
    }
  }
  for (const p of products) {
    const [lo] = priceRange(p)
    const cover = photosOf(p)[0]
    rows.push({
      kind: "product", id: p.id, title: p.name, titleBn: p.nameBn || p.name, sub: p.store?.name ?? p.group.name, subBn: p.store?.nameBn ?? p.group.nameBn,
      price: lo ? `from ${taka(lo, "en")}` : "", priceBn: lo ? `${taka(lo, "bn")} থেকে` : "",
      href: `/shop/${p.slug}`, image: cover ? photoUrl(cover) : "", score: 0,
      own: tokensOf([p.name, p.nameBn, p.detail, p.detailBn]), ctx: tokensOf([p.group.name, p.group.nameBn, GROUP_WORDS[p.group.slug] ?? "", p.store?.name ?? "", p.store?.nameBn ?? ""]),
    })
  }
  for (const v of vehicles) {
    const cover = photosOf(v)[0]
    const day = v.pricePerDay || v.routes[0]?.price || 0
    rows.push({
      kind: "vehicle", id: v.id, title: v.title, titleBn: v.titleBn || v.title, sub: v.offering.name, subBn: v.offering.nameBn,
      price: v.pricePerHour ? `${taka(v.pricePerHour, "en")}/hour` : day ? `${taka(day, "en")}/day` : "",
      priceBn: v.pricePerHour ? `${taka(v.pricePerHour, "bn")}/ঘণ্টা` : day ? `${taka(day, "bn")}/দিন` : "",
      href: `/vehicles/${v.id}`, image: cover ? photoUrl(cover) : "", score: 0,
      own: tokensOf([v.title, v.titleBn, v.specs, v.offering.name, v.offering.nameBn, v.routes.map((r) => `${r.name} ${r.spots}`).join(" ")]), ctx: tokensOf([CATEGORY_WORDS["rent-a-car"]]),
    })
  }
  for (const p of properties) {
    const cover = photosOf(p)[0]
    const night = fromNight(p)
    rows.push({
      kind: "stay", id: p.id, title: p.name, titleBn: p.nameBn || p.name, sub: p.area?.name ?? p.address, subBn: p.area?.nameBn ?? p.addressBn,
      price: night ? `from ${taka(night, "en")}/night` : "", priceBn: night ? `রাতপ্রতি ${taka(night, "bn")} থেকে` : "",
      href: `/stays/${p.id}`, image: cover ? photoUrl(cover) : "", score: 0,
      own: tokensOf([p.name, p.nameBn, p.kind, p.address, p.addressBn, p.amenities, p.area?.name ?? "", p.area?.nameBn ?? "", p.rooms.map((r) => `${r.name} ${r.nameBn}`).join(" ")]), ctx: tokensOf([CATEGORY_WORDS["resort-booking"]]),
    })
  }
  return rows
}

export async function searchIndex(shopId: string) {
  const hit = cache.get(shopId)
  if (hit && Date.now() - hit.at < TTL) return hit.rows
  const rows = await buildIndex(shopId)
  cache.set(shopId, { at: Date.now(), rows })
  return rows
}

export function clearSearchCache() {
  cache.clear()
}

function strip(r: Entry): Hit {
  const { own: _o, ctx: _c, ...hit } = r
  void _o
  void _c
  return hit
}

const KIND_BOOST: Record<HitKind, number> = { category: 1.15, offering: 1.1, product: 1, vehicle: 1, stay: 1 }

/** Ranked hits for a query; empty when nothing is close enough. */
export async function search(shopId: string, q: string, limit = 12): Promise<Hit[]> {
  const words = fold(q).split(" ").filter(Boolean)
  if (!words.length) return []
  const rows = await searchIndex(shopId)
  const scored: Hit[] = []
  for (const r of rows) {
    let total = 0
    let matched = 0
    for (const w of words) {
      let best = 0
      for (const d of r.own) {
        const s = tokenScore(w, d)
        if (s > best) best = s
        if (best === 3) break
      }
      // Category and store keywords count a little less, so an item's own name wins the top spots.
      if (best < 3) for (const d of r.ctx) {
        const s = tokenScore(w, d) * 0.7
        if (s > best) best = s
      }
      if (best) matched++
      total += best
    }
    if (!matched) continue
    // Every word should land for multi-word queries; one miss is forgiven when at least two hit.
    if (words.length > 1 && matched < words.length - (words.length >= 3 ? 1 : 0)) continue
    const hit = strip(r)
    scored.push({ ...hit, score: (total / words.length) * KIND_BOOST[r.kind] })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

/** A light "you might be looking for" strip when nothing matched: one or two of each kind. */
export async function suggestions(shopId: string, limit = 8): Promise<Hit[]> {
  const rows = await searchIndex(shopId)
  const per: Record<HitKind, number> = { category: 0, offering: 0, product: 0, vehicle: 0, stay: 0 }
  const cap: Record<HitKind, number> = { category: 2, offering: 2, product: 2, vehicle: 1, stay: 1 }
  const out: Hit[] = []
  for (const r of rows) {
    if (per[r.kind] >= cap[r.kind]) continue
    per[r.kind]++
    const hit = strip(r)
    out.push(hit)
    if (out.length >= limit) break
  }
  return out
}
