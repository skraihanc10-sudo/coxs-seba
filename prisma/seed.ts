/**
 * Seeds HANDYO. Safe to run again: everything is created only when it is
 * missing, and nothing the admin edited is overwritten.
 *   tsx prisma/seed.ts            shops + catalog + demo accounts + demo bookings
 *   tsx prisma/seed.ts --catalog  default shop, its areas, services, FAQs, templates, settings only
 */
import { existsSync } from "node:fs"
import { join } from "node:path"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { AREAS, CATEGORIES, DHAKA_AREAS, FAQS, REPLY_TEMPLATES, SHOPS } from "./catalog"
import { demoAccounts, demoShopStaff, demoWorkers, WORKER_PASSWORD } from "../src/theme/demo-accounts"
import { SETTING_DEFAULTS } from "../src/lib/settings"
import { GROUP_CATEGORY, SHOP_GROUPS, SHOP_PRODUCTS, SHOP_STORES } from "./shop-demo"
import { LAUNDRY_GROUP, LAUNDRY_ITEMS, LAUNDRY_STORE, laundryVariants } from "./laundry-demo"

const db = new PrismaClient()

/** "a,b" → the bundled demo vehicle photos that exist, comma-joined. */
function demoPhotos(keys: string) {
  return keys.split(",").map((k) => bundled(`/demo/vehicles/${k.trim()}.jpg`)).filter(Boolean).join(",")
}

/** A bundled illustration under public/, or "" when none ships for that path. */
function bundled(path: string) {
  return existsSync(join(process.cwd(), "public", path)) ? path : ""
}
const catalogOnly = process.argv.includes("--catalog")

/** The first branch keeps the fixed id the shops migration used for existing rows. */
export const DEFAULT_SHOP_ID = "shop_coxs_sadar"

function localDay(offset: number) {
  const now = new Date(Date.now() + 6 * 3600_000)
  now.setUTCDate(now.getUTCDate() + offset)
  return now.toISOString().slice(0, 10)
}

function at(offsetDays: number, hour: number) {
  return new Date(`${localDay(offsetDays)}T${String(hour).padStart(2, "0")}:15:00+06:00`)
}

async function ensureShop(shop: (typeof SHOPS)[number], id?: string) {
  const existing = await db.shop.findUnique({ where: { slug: shop.slug } })
  if (existing) {
    // "Cox's Bazar Sadar" became plain "Cox's Bazar" (the company serves the whole district).
    if (existing.cityBn === "কক্সবাজার সদর") {
      return db.shop.update({ where: { id: existing.id }, data: { city: shop.city, cityBn: shop.cityBn, address: shop.address, addressBn: shop.addressBn, blurb: shop.blurb, blurbBn: shop.blurbBn } })
    }
    return existing
  }
  return db.shop.create({ data: { ...(id ? { id } : {}), ...shop } })
}

/** Areas, services, templates and settings for one shop. Only adds what is missing. */
async function catalogFor(shopId: string, areas: typeof AREAS, categories: typeof CATEGORIES) {
  for (const [i, a] of areas.entries()) {
    await db.serviceArea.upsert({ where: { shopId_slug: { shopId, slug: a.slug } }, update: {}, create: { ...a, shopId, sort: i } })
  }
  for (const [i, c] of categories.entries()) {
    const { offerings, ...cat } = c
    // Existing rows keep their own edits; only a missing/bundled illustration is refreshed to the current bundled one.
    const current = await db.serviceCategory.findUnique({ where: { shopId_slug: { shopId, slug: c.slug } }, select: { image: true, codePrefix: true } })
    const refreshImage = current && (!current.image || current.image.startsWith("/services/") || current.image.startsWith("/demo/")) && current.image !== cat.image
    // A booking prefix shared with another category (old seeds gave pickles and AC repair both "AC") moves to the catalog's current one.
    const refreshPrefix = current && current.codePrefix !== cat.codePrefix && categories.some((o) => o.slug !== c.slug && o.codePrefix === current.codePrefix)
    // Car & bike rental is the lead category: pinned first on every seed.
    const pin = c.slug === "saint-martin-ship" ? { sort: -5 } : c.slug === "rent-a-car" ? { sort: -4 } : c.slug === "resort-booking" ? { sort: -3 } : c.slug === "shutki" ? { sort: -2 } : c.slug === "achar" ? { sort: -1 } : {}
    const row = await db.serviceCategory.upsert({ where: { shopId_slug: { shopId, slug: c.slug } }, update: { ...(refreshImage ? { image: cat.image } : {}), ...(refreshPrefix ? { codePrefix: cat.codePrefix } : {}), ...pin }, create: { ...cat, shopId, sort: i, ...pin } })
    for (const [j, o] of offerings.entries()) {
      // Every offering ships with an AI illustration under public/services/offerings; rows keep an admin-uploaded photo.
      const image = bundled(`/services/offerings/${c.slug}/${o.slug}.jpg`)
      const have = await db.serviceOffering.findUnique({ where: { categoryId_slug: { categoryId: row.id, slug: o.slug } }, select: { image: true } })
      const refresh = image && have && (!have.image || have.image.startsWith("/services/")) && have.image !== image
      await db.serviceOffering.upsert({
        where: { categoryId_slug: { categoryId: row.id, slug: o.slug } },
        update: refresh ? { image } : {},
        create: { ...o, image, minQty: o.minQty ?? 1, categoryId: row.id, sort: j },
      })
    }
  }
  if ((await db.replyTemplate.count({ where: { shopId } })) === 0) {
    await db.replyTemplate.createMany({ data: REPLY_TEMPLATES.map((t, i) => ({ ...t, shopId, sort: i })) })
  }
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await db.setting.upsert({ where: { shopId_key: { shopId, key } }, update: {}, create: { shopId, key, value } })
  }
  // Company rule since 2026-11-24: HANDYO keeps 10 % of every partner business, so partners get 90 %.
  await db.setting.updateMany({ where: { shopId, key: "partnerShare", value: "85" }, data: { value: "90" } })
  // Hero text rewritten 2026-11-24 for the wider company; only rows still holding the old default move.
  await db.setting.updateMany({ where: { shopId, key: "heroBn", value: { in: ["আপনি নিশ্চিন্তে থাকুন, কাজটা আমরা করে দিই।", "কক্সবাজারে যা দরকার, সব HANDYO-তে।"] } }, data: { value: SETTING_DEFAULTS.heroBn } })
  await db.setting.updateMany({ where: { shopId, key: "heroEn", value: { in: ["You relax. We get it done.", "Everything you need in Cox's Bazar, on HANDYO."] } }, data: { value: SETTING_DEFAULTS.heroEn } })
  await db.setting.updateMany({ where: { shopId, key: "bannerBn", value: { in: ["ঘরে বসেই সব সেবা: লন্ড্রি, ইলেকট্রিশিয়ান, প্লাম্বার, ক্লিনিং আর আরও অনেক কিছু।", "ঘরের সেবা, গাড়ি-বাইক ভাড়া, রিসোর্ট বুকিং আর কক্সবাজারের শুঁটকি-আচার – এক অ্যাপে, দাম আগেই জানা।"] } }, data: { value: SETTING_DEFAULTS.bannerBn } })
  await db.setting.updateMany({ where: { shopId, key: "bannerEn", value: { in: ["Every home service at your door: laundry, electricians, plumbers, cleaning and more.", "Home services, car & bike rental, resort booking and Cox's Bazar dried fish & pickles: one app, prices up front."] } }, data: { value: SETTING_DEFAULTS.bannerEn } })
}

async function catalog() {
  const coxs = await ensureShop(SHOPS[0], DEFAULT_SHOP_ID)
  await catalogFor(coxs.id, AREAS, CATEGORIES)
  if ((await db.faq.count()) === 0) {
    await db.faq.createMany({ data: FAQS.map((f, i) => ({ ...f, sort: i })) })
  }
  console.log(`Catalog ready for ${coxs.name}: ${AREAS.length} areas, ${CATEGORIES.length} service categories`)
  return coxs
}

async function user(email: string, data: { name: string; phone: string; role: string; password: string; shopId?: string | null }) {
  return db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: data.name, phone: data.phone, role: data.role, shopId: data.shopId ?? null, passwordHash: await bcrypt.hash(data.password, 10) },
  })
}

async function demo(coxs: { id: string }) {
  const people: Record<string, { id: string; name: string }> = {}
  for (const a of demoAccounts) people[a.email] = await user(a.email, { ...a, shopId: a.role === "OWNER" || a.role === "CUSTOMER" ? null : coxs.id })

  // A second branch so the owner can see separate books: HANDYO Dhaka, same services, its own areas and team.
  const dhaka = await ensureShop(SHOPS[1])
  await catalogFor(dhaka.id, DHAKA_AREAS, CATEGORIES.filter((c) => c.slug !== "rent-a-car"))
  for (const s of demoShopStaff) await user(s.email, { ...s, shopId: s.shop === "dhaka" ? dhaka.id : coxs.id })

  const categories = Object.fromEntries((await db.serviceCategory.findMany({ where: { shopId: coxs.id } })).map((c) => [c.slug, c]))
  const dhakaCategories = Object.fromEntries((await db.serviceCategory.findMany({ where: { shopId: dhaka.id } })).map((c) => [c.slug, c]))
  const workers: Record<string, { id: string; userId: string }> = {}
  for (const w of demoWorkers) {
    const shopId = w.shop === "dhaka" ? dhaka.id : coxs.id
    const cats = w.shop === "dhaka" ? dhakaCategories : categories
    const u = await user(w.email, { name: w.name, phone: w.phone, role: "WORKER", password: WORKER_PASSWORD, shopId })
    const kind = "kind" in w && w.kind === "PARTNER" ? "PARTNER" : "STAFF"
    const profile = await db.workerProfile.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, shopId, isRider: w.isRider, kind, approved: true, nid: `19${w.phone.slice(-8)}0012345`.slice(0, 17) },
    })
    for (const slug of w.skills) {
      const cat = cats[slug]
      if (!cat) continue
      await db.workerSkill.upsert({
        where: { workerId_categoryId: { workerId: profile.id, categoryId: cat.id } },
        update: {},
        create: { workerId: profile.id, categoryId: cat.id },
      })
    }
    workers[w.email] = { id: profile.id, userId: u.id }
  }

  // Vehicles customers can pick on the rent-a-car page: two of HANDYO's own, two from the partner, one waiting for approval.
  const rentalOfferings = Object.fromEntries((await db.serviceOffering.findMany({ where: { categoryId: categories["rent-a-car"].id } })).map((o) => [o.slug, o]))
  const vehicles: Array<{ key: string; photo: string; type: string; owner: string | null; title: string; titleBn: string; plate: string; seats: number; hour: number; day: number; half?: number; specs?: string; minHours: number; detail: string; detailBn: string; status: string }> = [
    { key: "noah", photo: "car-noah", type: "car", owner: null, title: "Toyota Noah 2018 (AC)", titleBn: "টয়োটা নোয়া ২০১৮ (এসি)", plate: "Cox-Ga-11-2233", seats: 7, hour: 600, day: 4000, half: 2500, specs: "7 seats, AC, Driver included", minHours: 2, detail: "Driver and fuel included inside town; Inani/Himchari day trips.", detailBn: "ড্রাইভার ও তেলসহ, শহরের মধ্যে; ইনানী-হিমছড়ি ডে ট্রিপ।", status: "APPROVED" },
    { key: "jeep", photo: "jeep-marine", type: "chander-gari", owner: null, title: "Open-roof Marine Drive jeep", titleBn: "ছাদখোলা মেরিন ড্রাইভ জিপ", plate: "Cox-Tha-12-4455", seats: 8, hour: 0, day: 4500, half: 2800, specs: "Open roof, 8 seats, Driver included", minHours: 1, detail: "Open-roof jeep for the Marine Drive run to Inani, with driver.", detailBn: "মেরিন ড্রাইভ ধরে ইনানী পর্যন্ত ছাদখোলা জিপ, ড্রাইভারসহ।", status: "APPROVED" },
    { key: "scooter", photo: "scooter-rayzr", type: "bike", owner: "partner.rony@needcoxs.test", title: "Yamaha Ray ZR scooter", titleBn: "ইয়ামাহা রে ZR স্কুটার", plate: "Cox-Ha-21-7788", seats: 2, hour: 150, day: 800, half: 500, specs: "125cc, Automatic, 2 helmets", minHours: 2, detail: "Self-drive, two helmets, licence required. Fuel extra.", detailBn: "নিজে চালাবেন, দুইটা হেলমেট, লাইসেন্স লাগবে। তেল আলাদা।", status: "APPROVED" },
    { key: "premio", photo: "car-premio", type: "car", owner: "partner.rony@needcoxs.test", title: "Toyota Premio 2016 (AC)", titleBn: "টয়োটা প্রিমিও ২০১৬ (এসি)", plate: "Cox-Ga-14-9911", seats: 4, hour: 500, day: 3500, half: 2000, specs: "AC, 4 seats, Driver included", minHours: 2, detail: "AC sedan with driver and fuel, inside town.", detailBn: "এসি সেডান, ড্রাইভার ও তেলসহ, শহরের মধ্যে।", status: "APPROVED" },
    { key: "hiace", photo: "micro-hiace-2", type: "bus", owner: "partner.rony@needcoxs.test", title: "Toyota Hiace microbus (11 seats)", titleBn: "টয়োটা হাইয়েস মাইক্রোবাস (১১ সিট)", plate: "Cox-Cha-11-3344", seats: 11, hour: 900, day: 6500, minHours: 3, detail: "For groups: Teknaf, Inani, Ramu day tours.", detailBn: "গ্রুপের জন্য: টেকনাফ, ইনানী, রামু ডে ট্যুর।", status: "PENDING" },
    { key: "stylo", photo: "scooter-stylo", type: "bike", owner: "partner.rony@needcoxs.test", title: "Honda Stylo 160 scooter", titleBn: "হোন্ডা স্টাইলো ১৬০ স্কুটার", plate: "Cox-Ha-22-1190", seats: 2, hour: 200, day: 1000, half: 600, specs: "160cc, Automatic, Retro look, 2 helmets", minHours: 2, detail: "Comfortable retro scooter, self-drive with two helmets. Licence required, fuel extra.", detailBn: "আরামের রেট্রো স্কুটার, নিজে চালাবেন, দুইটা হেলমেট। লাইসেন্স লাগবে, তেল আলাদা।", status: "APPROVED" },
    { key: "dio", photo: "scooter-dio,scooter-dio-2", type: "bike", owner: null, title: "Honda Dio scooter", titleBn: "হোন্ডা ডিও স্কুটার", plate: "Cox-Ha-19-3307", seats: 2, hour: 150, day: 800, half: 500, specs: "110cc, Automatic, Light & easy, 2 helmets", minHours: 2, detail: "Light automatic scooter for the beach road and Marine Drive. Two helmets, fuel extra.", detailBn: "হালকা অটোমেটিক স্কুটার, বিচ রোড আর মেরিন ড্রাইভের জন্য। দুইটা হেলমেট, তেল আলাদা।", status: "APPROVED" },
    { key: "cg-red", photo: "chander-gari-red", type: "chander-gari", owner: "partner.rony@needcoxs.test", title: "Chander gari, red (Toyota Land Cruiser pickup)", titleBn: "চান্দের গাড়ি, লাল (টয়োটা ল্যান্ড ক্রুজার পিকআপ)", plate: "Cox-Tha-15-2210", seats: 10, hour: 0, day: 4500, half: 2800, specs: "Open roof, 7–10 people, Driver included, Route packages", minHours: 1, detail: "Classic red chander gari with driver: Himchari, Inani, Patuartek along Marine Drive.", detailBn: "ক্লাসিক লাল চান্দের গাড়ি, ড্রাইভারসহ: হিমছড়ি, ইনানী, পাটুয়ারটেক মেরিন ড্রাইভ ধরে।", status: "APPROVED" },
    { key: "cg-long-yellow", photo: "chander-gari-long-yellow", type: "chander-gari", owner: null, title: "Long chander gari, yellow (13 seats)", titleBn: "লম্বা চান্দের গাড়ি, হলুদ (১৩ সিট)", plate: "Cox-Tha-17-6601", seats: 13, hour: 0, day: 6000, half: 3500, specs: "Long body, Open roof, 10–13 people, Driver included, Route packages", minHours: 1, detail: "Long-bed Land Cruiser for big groups: up to 13 people, Teknaf and Shah Porir Dwip day trips.", detailBn: "বড় গ্রুপের জন্য লম্বা বডির ল্যান্ড ক্রুজার: ১৩ জন পর্যন্ত, টেকনাফ ও শাহপরীর দ্বীপ ডে ট্রিপ।", status: "APPROVED" },
    { key: "cg-long-blue", photo: "chander-gari-long-blue,chander-gari-long-blue-2", type: "chander-gari", owner: "partner.rony@needcoxs.test", title: "Long chander gari, blue (13 seats)", titleBn: "লম্বা চান্দের গাড়ি, নীল (১৩ সিট)", plate: "Cox-Tha-18-7742", seats: 13, hour: 0, day: 6000, half: 3500, specs: "Long body, Open roof, 10–13 people, Driver included, Route packages", minHours: 1, detail: "Blue long-bed chander gari with shade frame, driver included. Marine Drive to Sonaichari or Teknaf.", detailBn: "নীল লম্বা চান্দের গাড়ি, ছাউনির ফ্রেমসহ, ড্রাইভারসহ। মেরিন ড্রাইভ থেকে সোনাইছড়ি বা টেকনাফ।", status: "APPROVED" },
  ]
  for (const [i, v] of vehicles.entries()) {
    const offering = rentalOfferings[v.type]
    if (!offering) continue
    const existing = await db.vehicle.findFirst({ where: { shopId: coxs.id, plate: v.plate } })
    if (existing) {
      // Older rows: fill the newer marketplace fields once, never overwrite edits.
      if (!existing.specs && !existing.pricePerHalfDay) await db.vehicle.update({ where: { id: existing.id }, data: { specs: v.specs ?? "", pricePerHalfDay: v.half ?? 0 } })
      if (!existing.photos && demoPhotos(v.photo)) await db.vehicle.update({ where: { id: existing.id }, data: { photos: demoPhotos(v.photo) } })
      continue
    }
    await db.vehicle.create({
      data: {
        shopId: coxs.id,
        workerId: v.owner ? workers[v.owner].id : null,
        offeringId: offering.id,
        title: v.title,
        titleBn: v.titleBn,
        plate: v.plate,
        seats: v.seats,
        photos: demoPhotos(v.photo),
        pricePerHour: v.hour,
        pricePerDay: v.day,
        pricePerHalfDay: v.half ?? 0,
        specs: v.specs ?? "",
        minHours: v.minHours,
        detail: v.detail,
        detailBn: v.detailBn,
        status: v.status,
        sort: i,
      },
    })
  }

  // Two demo discount codes: one site-wide percent, one fixed amount for rentals.
  for (const c of [
    { code: "HANDYO10", kind: "PERCENT", value: 10, maxDiscount: 300, minAmount: 0, categoryId: null as string | null, perCustomer: 1, note: "প্রথম বুকিংয়ে ১০% ছাড়, সর্বোচ্চ ৳৩০০" },
    { code: "MARINE500", kind: "FIXED", value: 500, maxDiscount: 0, minAmount: 3000, categoryId: categories["rent-a-car"].id, perCustomer: 0, note: "গাড়ি ভাড়ায় ৳৩,০০০-এর ওপরে ৳৫০০ ছাড়" },
  ]) {
    await db.coupon.upsert({ where: { shopId_code: { shopId: coxs.id, code: c.code } }, update: {}, create: { ...c, shopId: coxs.id } })
  }

  // A few more neighbours so the dashboard and reports have history.
  const extra = [
    { email: "tania@needcoxs.test", name: "তানিয়া ইসলাম", phone: "01911000001" },
    { email: "hotel.seapearl@needcoxs.test", name: "সী পার্ল গেস্ট হাউস", phone: "01911000002" },
    { email: "mahmud@needcoxs.test", name: "মাহমুদ হাসান", phone: "01911000003" },
  ]
  for (const e of extra) people[e.email] = await user(e.email, { ...e, role: "CUSTOMER", password: `demo-${e.phone}` })

  if (await db.serviceBooking.findUnique({ where: { code: "LN-10001" } })) {
    console.log("Demo bookings already present; skipping")
    return
  }

  const areas = Object.fromEntries((await db.serviceArea.findMany({ where: { shopId: coxs.id } })).map((a) => [a.slug, a]))
  const offerings = await db.serviceOffering.findMany({ where: { category: { shopId: coxs.id } }, include: { category: true } })
  const offer = (cat: string, slug: string) => offerings.find((o) => o.category.slug === cat && o.slug === slug)!

  const customer = people["customer@needcoxs.test"]
  const admin = people["admin@needcoxs.test"]
  const support = people["support@needcoxs.test"]

  type Demo = {
    code: string
    who: string
    cat: string
    slug: string
    area: string
    status: string
    worker?: string
    qty?: number
    days?: number
    team?: number
    day: number
    slot: string
    notes?: string
    pay?: string
    quote?: { amount: number; status: string }
    review?: { rating: number; comment: string }
    chat?: Array<[string, string]>
  }

  const VISIT = ["REQUESTED", "CONFIRMED", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"]
  const LAUNDRY = ["REQUESTED", "CONFIRMED", "ASSIGNED", "ACCEPTED", "PICKED_UP", "AT_LAUNDRY", "READY", "OUT_FOR_DELIVERY", "COMPLETED"]

  const demos: Demo[] = [
    { code: "CS-10001", who: "customer@needcoxs.test", cat: "laundry", slug: "wash-iron", area: "kolatoli", status: "COMPLETED", worker: "rider@needcoxs.test", qty: 5, day: -3, slot: "08:00–11:00", review: { rating: 5, comment: "কাপড় খুব সুন্দর করে ভাঁজ করে দিয়েছে, সময়মতো ফেরত।" } },
    { code: "CS-10002", who: "customer@needcoxs.test", cat: "electrician", slug: "fan-light", area: "tekpara", status: "ON_THE_WAY", worker: "jamal.electric@needcoxs.test", day: 0, slot: "14:00–17:00", notes: "বেডরুমের ফ্যান ঘোরে না, শব্দ করে।", chat: [["customer@needcoxs.test", "ভাই, কতক্ষণ লাগবে আসতে?"], ["jamal.electric@needcoxs.test", "২০ মিনিটের মধ্যে পৌঁছাব ইনশাআল্লাহ।"]] },
    { code: "CS-10003", who: "customer@needcoxs.test", cat: "plumber", slug: "leakage", area: "bazarghata", status: "ARRIVED", worker: "karim.plumber@needcoxs.test", day: 0, slot: "11:00–14:00", notes: "রান্নাঘরের সিঙ্কের নিচে পানি পড়ছে।", quote: { amount: 1200, status: "SENT" } },
    { code: "CS-10004", who: "tania@needcoxs.test", cat: "home-cleaning", slug: "deep-clean", area: "link-road", status: "REQUESTED", qty: 3, day: 1, slot: "08:00–11:00", notes: "৩ রুমের ফ্ল্যাট, ঈদের আগে পরিষ্কার।" },
    { code: "CS-10005", who: "hotel.seapearl@needcoxs.test", cat: "resort-cleaning", slug: "room-turnover", area: "hotel-motel-zone", status: "CONFIRMED", qty: 20, days: 2, team: 4, day: 2, slot: "08:00–11:00", notes: "শুক্রবার বড় গ্রুপ চেক-আউট করবে।" },
    { code: "CS-10006", who: "mahmud@needcoxs.test", cat: "wifi", slug: "router-setup", area: "jhautala", status: "CANCELLED", day: -1, slot: "17:00–20:00" },
    { code: "CS-10007", who: "customer@needcoxs.test", cat: "ac-fridge", slug: "ac-gas", area: "college-gate", status: "COMPLETED", worker: "rafiq.ac@needcoxs.test", day: -6, slot: "11:00–14:00", pay: "BKASH", review: { rating: 4, comment: "এসি এখন ভালো ঠান্ডা হচ্ছে। একটু দেরিতে এসেছিলেন।" } },
    { code: "CS-10008", who: "mahmud@needcoxs.test", cat: "laundry", slug: "dry-clean", area: "sugandha-point", status: "AT_LAUNDRY", worker: "rider@needcoxs.test", qty: 3, day: -1, slot: "11:00–14:00" },
    { code: "CS-10009", who: "tania@needcoxs.test", cat: "wifi", slug: "line-problem", area: "peshkarpara", status: "ASSIGNED", worker: "sumon.wifi@needcoxs.test", day: 0, slot: "17:00–20:00" },
    { code: "CS-10010", who: "mahmud@needcoxs.test", cat: "rent-a-car", slug: "open-roof-jeep", area: "kolatoli", status: "CONFIRMED", day: 1, slot: "14:00–17:00", notes: "৫ জন, হোটেল সী ক্রাউন থেকে পিকআপ।" },
  ]
  // Completed history over the last four weeks for charts and reports.
  const history: Array<[string, string, string, string, number, number]> = [
    ["laundry", "wash-iron", "kolatoli", "rider@needcoxs.test", 4, -1],
    ["electrician", "fan-light", "tekpara", "jamal.electric@needcoxs.test", 1, -2],
    ["plumber", "tap-basin", "bazarghata", "karim.plumber@needcoxs.test", 1, -2],
    ["home-cleaning", "kitchen", "link-road", "rina.clean@needcoxs.test", 1, -4],
    ["wifi", "new-connection", "jhautala", "sumon.wifi@needcoxs.test", 1, -5],
    ["laundry", "hotel-linen", "hotel-motel-zone", "rider@needcoxs.test", 30, -5],
    ["ac-fridge", "ac-install", "college-gate", "rafiq.ac@needcoxs.test", 1, -8],
    ["resort-cleaning", "room-turnover", "laboni-point", "rina.clean@needcoxs.test", 12, -9],
    ["electrician", "ips-meter", "ghonarpara", "jamal.electric@needcoxs.test", 1, -11],
    ["labour", "day-labour", "khuruskul", "karim.plumber@needcoxs.test", 1, -13],
    ["laundry", "iron-only", "sugandha-point", "rider@needcoxs.test", 12, -15],
    ["shifting", "furniture-move", "pahartali", "karim.plumber@needcoxs.test", 1, -18],
    ["electrician", "ac-service", "airport-road", "rafiq.ac@needcoxs.test", 1, -20],
    ["home-cleaning", "bathroom", "baharchhara", "rina.clean@needcoxs.test", 2, -22],
    ["wifi", "router-setup", "burmese-market", "sumon.wifi@needcoxs.test", 1, -25],
    ["laundry", "wash-iron", "jhilonja", "rider@needcoxs.test", 6, -27],
    ["rent-a-car", "car-daily", "hotel-motel-zone", "faruk.driver@needcoxs.test", 1, -3],
    ["rent-a-car", "open-roof-jeep", "kolatoli", "faruk.driver@needcoxs.test", 1, -7],
  ]
  const who = ["tania@needcoxs.test", "hotel.seapearl@needcoxs.test", "mahmud@needcoxs.test", "customer@needcoxs.test"]
  history.forEach(([cat, slug, area, worker, qty, day], i) => {
    demos.push({ code: `CS-${20001 + i}`, who: who[i % who.length], cat, slug, area, status: "COMPLETED", worker, qty, day, slot: "11:00–14:00", pay: i % 3 === 0 ? "BKASH" : "CASH", review: i % 2 ? { rating: 4 + (i % 2), comment: "ভালো কাজ, ধন্যবাদ।" } : undefined })
  })

  for (const d of demos) {
    const o = offer(d.cat, d.slug)
    const area = areas[d.area]
    const qty = Math.max(o.minQty, d.qty ?? 1)
    const days = d.days ?? 1
    const quantityPriced = ["PER_KG", "PER_ITEM", "PER_HOUR", "PER_DAY", "PER_ROOM"].includes(o.pricing)
    const work = quantityPriced ? o.price * qty * (o.pricing === "PER_ROOM" ? days : 1) : o.price
    const quoteAccepted = d.quote?.status === "ACCEPTED"
    const estimated = (quoteAccepted ? d.quote!.amount : work) + area.charge
    const steps = o.category.flow === "LAUNDRY" ? LAUNDRY : VISIT
    const path = d.status === "CANCELLED" ? ["REQUESTED", "CANCELLED"] : steps.slice(0, steps.indexOf(d.status) + 1)
    const customerId = people[d.who].id
    const w = d.worker ? workers[d.worker] : undefined
    const created = at(d.day - 1, 10)
    const done = d.status === "COMPLETED"

    const booking = await db.serviceBooking.create({
      data: {
        code: `${o.category.codePrefix || "HB"}-${d.code.split("-")[1]}`,
        shopId: coxs.id,
        customerId,
        categoryId: o.categoryId,
        offeringId: o.id,
        areaId: area.id,
        addressLine: `বাড়ি ${12 + demos.indexOf(d)}, রোড ${3 + (demos.indexOf(d) % 5)}`,
        landmark: "মসজিদের পাশে",
        phone: (await db.user.findUnique({ where: { id: customerId } }))!.phone ?? "01711000001",
        contactName: people[d.who].name,
        visitDate: localDay(d.day),
        visitSlot: d.slot,
        notes: d.notes ?? "",
        pricing: o.pricing,
        unitPrice: o.price,
        quantity: qty,
        teamSize: d.team ?? 1,
        days,
        visitCharge: area.charge,
        estimatedPrice: estimated,
        quoteAmount: d.quote?.amount ?? null,
        quoteStatus: d.quote?.status ?? "NONE",
        finalPrice: done ? estimated : null,
        paymentMethod: d.pay ?? "CASH",
        paymentStatus: done ? "PAID" : "UNPAID",
        status: d.status,
        workerId: w?.id ?? null,
        cancelReason: d.status === "CANCELLED" ? "কাস্টমার অন্য সময়ে করবেন" : "",
        completedAt: done ? at(d.day, 16) : null,
        createdAt: created,
        chat: { create: {} },
      },
    })
    let prev = ""
    for (const [i, status] of path.entries()) {
      const workerStep = !["REQUESTED", "CONFIRMED", "ASSIGNED", "CANCELLED"].includes(status)
      const actor = status === "REQUESTED" || status === "CANCELLED" ? customerId : workerStep && w ? w.userId : admin.id
      await db.bookingEvent.create({
        data: {
          bookingId: booking.id,
          fromStatus: prev,
          toStatus: status,
          note: status === "CANCELLED" ? "কাস্টমার অন্য সময়ে করবেন" : "",
          actorId: actor,
          actorRole: actor === customerId ? "CUSTOMER" : actor === admin.id ? "ADMIN" : "WORKER",
          createdAt: new Date(created.getTime() + i * 45 * 60_000),
        },
      })
      prev = status
    }
    if (done) {
      await db.paymentRecord.create({ data: { bookingId: booking.id, provider: d.pay ?? "CASH", amount: estimated, createdAt: at(d.day, 16) } })
    }
    if (d.review && done) {
      await db.bookingReview.create({ data: { bookingId: booking.id, customerId, workerId: w?.id ?? null, rating: d.review.rating, comment: d.review.comment, createdAt: at(d.day, 18) } })
    }
    if (d.chat) {
      const thread = await db.bookingThread.findUnique({ where: { bookingId: booking.id } })
      for (const [i, [from, body]] of d.chat.entries()) {
        const sender = from.startsWith("customer") ? customerId : workers[from]?.userId ?? support.id
        await db.bookingChatMessage.create({ data: { threadId: thread!.id, senderId: sender, body, createdAt: new Date(Date.now() - (d.chat.length - i) * 6 * 60_000) } })
      }
    }
  }

  // Worker ratings from the reviews above.
  for (const w of Object.values(workers)) {
    const agg = await db.bookingReview.aggregate({ where: { workerId: w.id }, _avg: { rating: true }, _count: true })
    await db.workerProfile.update({ where: { id: w.id }, data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } })
  }

  // One open ticket and one customer-care conversation for the support inbox.
  // Re-running the seed on a live database stops here: everything below already exists.
  if (await db.ticket.findUnique({ where: { code: "TK-10001" } })) return
  const b7 = await db.serviceBooking.findUnique({ where: { code: "AC-10007" } })
  await db.ticket.create({
    data: {
      code: "TK-10001",
      shopId: coxs.id,
      userId: customer.id,
      bookingId: b7?.id,
      subject: "এসি গ্যাসের পর আবার পানি পড়ছে",
      category: "COMPLAINT",
      priority: "HIGH",
      messages: { create: [{ senderId: customer.id, body: "গতকাল গ্যাস ভরার পর থেকে ইনডোর ইউনিট থেকে পানি পড়ছে। কেউ কি আবার দেখবেন?" }] },
      reads: { create: { userId: customer.id } },
    },
  })
  const care = await db.careThread.create({ data: { shopId: coxs.id, customerId: people["tania@needcoxs.test"].id } })
  await db.careMessage.createMany({
    data: [
      { threadId: care.id, senderId: people["tania@needcoxs.test"].id, body: "আসসালামু আলাইকুম, খুরুশকুলে কি লন্ড্রি পিকআপ হয়?", createdAt: new Date(Date.now() - 50 * 60_000) },
    ],
  })
  await db.notice.create({
    data: { userId: customer.id, kind: "QUOTE", title: "PL-10003 · দাম এসেছে", body: "কাজের দাম ৳1200। মেনে নিলে কাজ শুরু হবে।", link: "/bookings/PL-10003" },
  })

  // One Dhaka booking so the owner overview shows two sets of books.
  const dhakaAreas = await db.serviceArea.findMany({ where: { shopId: dhaka.id } })
  const dhakaOffer = await db.serviceOffering.findFirst({ where: { slug: "fan-light", category: { shopId: dhaka.id } } })
  const dhakaWorker = workers["dhaka.electric@needcoxs.test"]
  if (dhakaOffer && dhakaAreas[0] && dhakaWorker) {
    await db.serviceBooking.create({
      data: {
        code: "EL-30001",
        shopId: dhaka.id,
        customerId: people["mahmud@needcoxs.test"].id,
        categoryId: dhakaOffer.categoryId,
        offeringId: dhakaOffer.id,
        areaId: dhakaAreas[0].id,
        addressLine: "বাড়ি ৭, রোড ১১, ধানমন্ডি",
        phone: "01911000003",
        contactName: "মাহমুদ হাসান",
        visitDate: localDay(-2),
        visitSlot: "11:00–14:00",
        pricing: dhakaOffer.pricing,
        unitPrice: dhakaOffer.price,
        visitCharge: dhakaAreas[0].charge,
        estimatedPrice: dhakaOffer.price + dhakaAreas[0].charge,
        finalPrice: dhakaOffer.price + dhakaAreas[0].charge,
        paymentStatus: "PAID",
        status: "COMPLETED",
        workerId: dhakaWorker.id,
        completedAt: at(-2, 15),
        createdAt: at(-3, 10),
        chat: { create: {} },
        events: { create: [{ toStatus: "REQUESTED", actorRole: "CUSTOMER" }, { fromStatus: "REQUESTED", toStatus: "COMPLETED", actorRole: "WORKER" }] },
        payments: { create: { provider: "CASH", amount: dhakaOffer.price + dhakaAreas[0].charge } },
      },
    })
  }
  await db.sequence.upsert({ where: { name: "booking" }, update: {}, create: { name: "booking", value: 30001 } })
  console.log(`Demo data ready: ${demos.length} Cox's Bazar bookings + 1 Dhaka booking`)
}

/**
 * A database upgraded from the single-shop days has admins but no OWNER, and only
 * an OWNER can open Admin → Shops. Runs on every start (--catalog too) at the
 * user's request: creates the owner login once if no OWNER exists. Override the
 * email/password with OWNER_EMAIL / OWNER_PASSWORD; change the password after login.
 */
async function ensureOwner() {
  if (await db.user.count({ where: { role: "OWNER" } })) return
  const demo = demoAccounts.find((a) => a.role === "OWNER")!
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase() || demo.email
  const password = process.env.OWNER_PASSWORD || demo.password
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    await db.user.update({ where: { email }, data: { role: "OWNER", shopId: null, active: true } })
  } else {
    const phoneTaken = await db.user.findUnique({ where: { phone: demo.phone } })
    await db.user.create({ data: { email, name: demo.name, phone: phoneTaken ? null : demo.phone, role: "OWNER", shopId: null, passwordHash: await bcrypt.hash(password, 10) } })
  }
  console.log(`Owner login ready: ${email}${process.env.OWNER_PASSWORD ? "" : ` / ${password} (change it after logging in)`}`)
}

/**
 * Starter fleet so the rent-a-car marketplace is never empty: eight HANDYO
 * vehicles with bundled stock photos (public/demo/vehicles). Only runs when the
 * shop's rental category has no vehicle at all, so real listings are untouched.
 */
async function ensureDemoVehicles(shop: { id: string }) {
  const category = await db.serviceCategory.findFirst({ where: { shopId: shop.id, flow: "RENTAL" }, include: { offerings: true } })
  if (!category) return
  const existingCount = await db.vehicle.count({ where: { shopId: shop.id } })
  const byType = Object.fromEntries(category.offerings.map((o) => [o.slug, o.id]))
  type Route = { name: string; spots: string; hours: string; capacity: string; price: number }
  const jeepRoutes: Route[] = [
    { name: "Cox's Bazar to Patuartek", spots: "Daria Nagar, Himchari, Goalia (Mini Bandarban), Lal Kakra, Inani & Patuartek", hours: "6–7 hours", capacity: "7–13 people", price: 4000 },
    { name: "Cox's Bazar to Shah Porir Dwip", spots: "Daria Nagar, Himchari, Goalia, Lal Kakra, Inani, Patuartek, Teknaf Zero Point, Sabrang Tourism Park & Shah Porir Dwip", hours: "8–10 hours", capacity: "7–13 people", price: 7000 },
    { name: "Cox's Bazar to Sonaichari", spots: "Ramu Rubber Garden, Buddhist Temple & Sonaichari", hours: "7–8 hours", capacity: "7–13 people", price: 7000 },
  ]
  const carRoutes: Route[] = [
    { name: "Airport pickup or drop", spots: "Cox's Bazar airport to your hotel, or back", hours: "~1 hour", capacity: "up to 4 people", price: 700 },
    { name: "Marine Drive to Inani", spots: "Kolatoli, Himchari, Inani beach", hours: "4–5 hours", capacity: "up to 4 people", price: 2500 },
  ]
  const busRoutes: Route[] = [
    { name: "Cox's Bazar to Teknaf day tour", spots: "Himchari, Inani, Patuartek, Teknaf Zero Point", hours: "9–10 hours", capacity: "10–11 people", price: 9500 },
    { name: "Ramu & Sonaichari tour", spots: "Ramu Rubber Garden, Buddhist Temple, Sonaichari", hours: "7–8 hours", capacity: "10–11 people", price: 8500 },
  ]
  const fleet: Array<{ type: string; photo: string; title: string; titleBn: string; seats: number; hour: number; half: number; day: number; minHours: number; specs: string; detail: string; detailBn: string; routes?: Route[] }> = [
    { type: "bike", photo: "bike-fz", title: "Yamaha FZS V3", titleBn: "ইয়ামাহা FZS V3", seats: 2, hour: 300, half: 1000, day: 2200, minHours: 2, specs: "149cc, Fuel injection, Dual-channel ABS", detail: "Premium handling for long-distance highway cruises. Two helmets included.", detailBn: "হাইওয়ে আর মেরিন ড্রাইভের জন্য আরামের বাইক। দুইটা হেলমেট সহ।" },
    { type: "bike", photo: "bike-gixxer", title: "Suzuki Gixxer SF", titleBn: "সুজুকি Gixxer SF", seats: 2, hour: 350, half: 1000, day: 2300, minHours: 2, specs: "155cc, Full fairing, Rear disc brake", detail: "Sporty ride for the Marine Drive run to Inani and Teknaf.", detailBn: "স্পোর্টি রাইড, মেরিন ড্রাইভ ধরে ইনানী-টেকনাফ।" },
    { type: "bike", photo: "bike-r15", title: "Yamaha R15 V4", titleBn: "ইয়ামাহা R15 V4", seats: 2, hour: 400, half: 1200, day: 2800, minHours: 2, specs: "155cc, Liquid cooled, ABS", detail: "The fast one. Licence required, self-drive only.", detailBn: "সবচেয়ে ফাস্ট। লাইসেন্স লাগবে, নিজে চালাবেন।" },
    { type: "car", photo: "car-allion", routes: carRoutes, title: "Toyota Allion (AC)", titleBn: "টয়োটা অ্যালিয়ন (এসি)", seats: 4, hour: 500, half: 2200, day: 3800, minHours: 2, specs: "AC, 4 seats, Driver included", detail: "AC sedan with driver and fuel, inside town and to the airport.", detailBn: "এসি সেডান, ড্রাইভার ও তেলসহ, শহরের মধ্যে ও এয়ারপোর্ট।" },
    { type: "car", photo: "car-swift", routes: carRoutes, title: "Suzuki Swift (AC)", titleBn: "সুজুকি সুইফট (এসি)", seats: 4, hour: 450, half: 2000, day: 3200, minHours: 2, specs: "AC, Compact, Driver included", detail: "Small and easy in beach-road traffic. Driver and fuel included.", detailBn: "ছোট গাড়ি, বিচ রোডের জ্যামে সুবিধা। ড্রাইভার ও তেলসহ।" },
    { type: "car", photo: "car-fortuner", title: "Toyota Fortuner (AC)", titleBn: "টয়োটা ফরচুনার (এসি)", seats: 7, hour: 900, half: 4000, day: 7000, minHours: 3, specs: "AC, 7 seats, 4x4, Driver included", detail: "Big SUV for families: Inani, Himchari, Teknaf day trips.", detailBn: "পরিবারের জন্য বড় SUV: ইনানী, হিমছড়ি, টেকনাফ ডে ট্রিপ।" },
    { type: "chander-gari", photo: "jeep-crv", title: "Chander gari (Toyota open-roof jeep)", titleBn: "চান্দের গাড়ি (টয়োটা ছাদখোলা জিপ)", seats: 13, hour: 0, half: 0, day: 0, minHours: 1, specs: "Open roof, 7–13 people, Driver included, Route packages", detail: "The classic Cox's Bazar chander gari: open roof, Marine Drive wind, with driver. Pick a route package below.", detailBn: "কক্সবাজারের আসল চান্দের গাড়ি: ছাদখোলা, মেরিন ড্রাইভের বাতাস, ড্রাইভারসহ। নিচে রুট প্যাকেজ বেছে নিন।", routes: jeepRoutes },
    { type: "bus", photo: "micro-hiace", routes: busRoutes, title: "Toyota Hiace microbus (11 seats)", titleBn: "টয়োটা হাইয়েস মাইক্রোবাস (১১ সিট)", seats: 11, hour: 900, half: 4000, day: 6500, minHours: 3, specs: "AC, 11 seats, Driver included", detail: "For groups: Teknaf, Inani, Ramu day tours with driver and fuel.", detailBn: "গ্রুপের জন্য: টেকনাফ, ইনানী, রামু ডে ট্যুর, ড্রাইভার ও তেলসহ।" },
  ]
  if (existingCount) {
    // Demo vehicles from an earlier version: give them their route packages and the
    // chander-gari naming once, without touching anything the admin edited.
    let patched = 0
    for (const v of fleet) {
      const row = await db.vehicle.findFirst({ where: { shopId: shop.id, photos: `/demo/vehicles/${v.photo}.jpg` }, include: { routes: true } })
      if (!row) continue
      if (v.routes && !row.routes.length) {
        await db.vehicleRoute.createMany({ data: v.routes.map((r, j) => ({ ...r, vehicleId: row.id, sort: j })) })
        patched++
      }
      if (v.photo === "jeep-crv" && row.title === "Marine Drive jeep (open roof)") {
        await db.vehicle.update({ where: { id: row.id }, data: { title: v.title, titleBn: v.titleBn, seats: v.seats, specs: v.specs, detail: v.detail, detailBn: v.detailBn, pricePerHour: v.hour, pricePerHalfDay: v.half, pricePerDay: v.day } })
      }
    }
    if (patched) console.log(`Demo fleet: route packages added to ${patched} vehicles`)
    return
  }
  let n = 0
  for (const [i, v] of fleet.entries()) {
    const offeringId = byType[v.type] ?? category.offerings[0]?.id
    if (!offeringId) continue
    await db.vehicle.create({
      data: {
        shopId: shop.id, offeringId, title: v.title, titleBn: v.titleBn, seats: v.seats, photos: `/demo/vehicles/${v.photo}.jpg`, pricePerHour: v.hour, pricePerHalfDay: v.half, pricePerDay: v.day, minHours: v.minHours, specs: v.specs, detail: v.detail, detailBn: v.detailBn, status: "APPROVED", sort: i,
        routes: v.routes ? { create: v.routes.map((r, j) => ({ ...r, sort: j })) } : undefined,
      },
    })
    n++
  }
  console.log(`Demo fleet added: ${n} vehicles with stock photos`)
}

/**
 * The rental category now has four vehicle types (bike, car, chander-gari, bus).
 * Older databases had six price-based ones; move their vehicles over and hide
 * the old offerings (bookings keep pointing at them).
 */
async function syncRentalTypes() {
  const moves: Record<string, string> = { "scooter-bike": "bike", "car-hourly": "car", "car-daily": "car", "open-roof-jeep": "chander-gari", microbus: "bus" }
  const categories = await db.serviceCategory.findMany({ where: { flow: "RENTAL" }, include: { offerings: true } })
  for (const c of categories) {
    const target = (slug: string) => c.offerings.find((o) => o.slug === slug)
    for (const o of c.offerings) {
      const to = moves[o.slug] ? target(moves[o.slug]) : o.slug === "airport-pickup" ? null : undefined
      if (to === undefined) continue
      if (to) await db.vehicle.updateMany({ where: { offeringId: o.id }, data: { offeringId: to.id } })
      if (o.active) await db.serviceOffering.update({ where: { id: o.id }, data: { active: false } })
    }
  }
}

/**
 * Starter resorts so the booking page is never empty: four HANDYO-managed
 * properties with stock photos (public/demo/stays). Only when the shop has none.
 */
async function ensureDemoProperties(shop: { id: string }) {
  const category = await db.serviceCategory.findFirst({ where: { shopId: shop.id, flow: "STAY" } })
  if (!category) return
  const areas = await db.serviceArea.findMany({ where: { shopId: shop.id } })
  const area = (slug: string) => areas.find((a) => a.slug === slug) ?? areas[0]
  if (!areas.length) return
  const list = [
    { area: "marine-drive-sadar", kind: "RESORT", photos: ["bluebay-cover", "room-bluebay-deluxe", "room-bluebay-family"], name: "Blue Bay Sea View Resort", nameBn: "ব্লু বে সি ভিউ রিসোর্ট", address: "Marine Drive, Inani", addressBn: "মেরিন ড্রাইভ, ইনানী", amenities: "Sea view, Pool, Breakfast, WiFi, Parking, Restaurant", detail: "Beachfront resort on Marine Drive with an infinity pool facing the sea. Breakfast and WiFi included.", detailBn: "মেরিন ড্রাইভে সমুদ্রের সামনে রিসোর্ট, সাগরমুখী ইনফিনিটি পুল। সকালের নাস্তা ও ওয়াইফাই সহ।",
      rooms: [{ name: "Deluxe Sea View", sleeps: 2, pricePerNight: 6500, totalRooms: 8, amenities: "Sea view balcony, AC, King bed", photos: "/demo/stays/room-bluebay-deluxe.jpg" }, { name: "Family Suite", sleeps: 4, pricePerNight: 11000, totalRooms: 4, amenities: "2 bedrooms, Sea view, AC, Mini fridge", photos: "/demo/stays/room-bluebay-family.jpg" }] },
    { area: "kolatoli", kind: "HOTEL", photos: ["kolatoli-cover", "room-kolatoli-suite", "room-kolatoli-standard"], name: "Kolatoli Grand Hotel", nameBn: "কলাতলী গ্র্যান্ড হোটেল", address: "Kolatoli Main Road", addressBn: "কলাতলী মেইন রোড", amenities: "Beach 2 min, Pool, Breakfast, WiFi, Elevator, Restaurant", detail: "City hotel two minutes from Kolatoli beach, rooftop pool and 24-hour reception.", detailBn: "কলাতলী সৈকত থেকে ২ মিনিট, ছাদে পুল, ২৪ ঘণ্টা রিসেপশন।",
      rooms: [{ name: "Standard Double", sleeps: 2, pricePerNight: 3500, totalRooms: 20, amenities: "AC, Queen bed, TV", photos: "/demo/stays/room-kolatoli-standard.jpg" }, { name: "Premium Twin", sleeps: 3, pricePerNight: 4800, totalRooms: 10, amenities: "AC, 2 beds, City view", photos: "/demo/stays/room-kolatoli-twin.jpg" }, { name: "Executive Suite", sleeps: 4, pricePerNight: 8500, totalRooms: 3, amenities: "Living room, Bathtub, Sea view", photos: "/demo/stays/room-kolatoli-suite.jpg" }] },
    { area: "marine-drive-sadar", kind: "COTTAGE", photos: ["himchari-cover", "room-himchari-hill", "room-himchari-family"], name: "Himchari Hill Cottages", nameBn: "হিমছড়ি হিল কটেজ", address: "Himchari, Marine Drive", addressBn: "হিমছড়ি, মেরিন ড্রাইভ", amenities: "Hill view, Garden, Breakfast, Bonfire, Parking", detail: "Wooden cottages on the hill above Himchari waterfall; sunset over the sea from every deck.", detailBn: "হিমছড়ি ঝরনার ওপরের পাহাড়ে কাঠের কটেজ; প্রতিটা ডেক থেকে সাগরে সূর্যাস্ত।",
      rooms: [{ name: "Hill Cottage", sleeps: 2, pricePerNight: 4200, totalRooms: 6, amenities: "Private deck, Fan + AC, Breakfast", photos: "/demo/stays/room-himchari-hill.jpg" }, { name: "Family Cottage", sleeps: 5, pricePerNight: 7500, totalRooms: 3, amenities: "2 rooms, Deck, Kitchenette", photos: "/demo/stays/room-himchari-family.jpg" }] },
    { area: "laboni-point", kind: "GUESTHOUSE", photos: ["laboni-cover", "room-laboni-family", "room-laboni-economy"], name: "Laboni Point Guest House", nameBn: "লাবণী পয়েন্ট গেস্ট হাউস", address: "Laboni Beach Road", addressBn: "লাবণী বিচ রোড", amenities: "Beach 5 min, WiFi, Family friendly, Parking", detail: "Budget-friendly guest house near Laboni point, clean rooms and a quiet garden.", detailBn: "লাবণী পয়েন্টের কাছে সাশ্রয়ী গেস্ট হাউস, পরিষ্কার রুম আর নিরিবিলি বাগান।",
      rooms: [{ name: "Economy Double", sleeps: 2, pricePerNight: 1800, totalRooms: 12, amenities: "AC, Double bed", photos: "/demo/stays/room-laboni-economy.jpg" }, { name: "Family Room", sleeps: 4, pricePerNight: 3200, totalRooms: 5, amenities: "AC, 2 beds, Balcony", photos: "/demo/stays/room-laboni-family.jpg" }] },
  ]
  if (await db.property.count({ where: { shopId: shop.id } })) {
    // Demo resorts from an earlier version: swap the old stock photos for the bundled set once; owner uploads stay.
    let refreshed = 0
    for (const p of list) {
      const row = await db.property.findFirst({ where: { shopId: shop.id, name: p.name }, include: { rooms: true } })
      if (!row) continue
      const photos = p.photos.map((x) => `/demo/stays/${x}.jpg`).join(",")
      if ((!row.photos || row.photos.startsWith("/demo/stays/")) && row.photos !== photos) {
        await db.property.update({ where: { id: row.id }, data: { photos } })
        refreshed++
      }
      for (const r of p.rooms) {
        const room = row.rooms.find((x) => x.name === r.name)
        if (room && !room.photos && r.photos) await db.roomType.update({ where: { id: room.id }, data: { photos: r.photos } })
      }
    }
    if (refreshed) console.log(`Demo resorts: photos refreshed on ${refreshed} properties`)
    return
  }
  let n = 0
  for (const [i, p] of list.entries()) {
    const a = area(p.area)
    await db.property.create({
      data: {
        shopId: shop.id, areaId: a.id, kind: p.kind, name: p.name, nameBn: p.nameBn, address: p.address, addressBn: p.addressBn, amenities: p.amenities, detail: p.detail, detailBn: p.detailBn,
        photos: p.photos.map((x) => `/demo/stays/${x}.jpg`).join(","), status: "APPROVED", sort: i,
        policyBn: "চেক-ইন দুপুর ২টা, চেক-আউট দুপুর ১২টা। ২৪ ঘণ্টা আগে বাতিল করলে পুরো টাকা ফেরত।", policy: "Check-in 2 pm, check-out 12 pm. Free cancellation up to 24 hours before check-in.",
        rooms: { create: p.rooms.map((r, j) => ({ ...r, sort: j })) },
      },
    })
    n++
  }
  console.log(`Demo resorts added: ${n} properties with stock photos`)
}

/**
 * The product shop needs a hidden "nationwide" delivery area (orders ship by
 * courier anywhere) and, the first time, the owner's catalogue as demo data.
 */
async function ensureProductShop(shop: { id: string }) {
  await db.serviceArea.upsert({ where: { shopId_slug: { shopId: shop.id, slug: "nationwide" } }, update: {}, create: { shopId: shop.id, slug: "nationwide", name: "Nationwide courier", nameBn: "সারা দেশে কুরিয়ার", charge: 0, sort: 999, active: false } })
  // The single "cox-shutki" category was split into শুঁটকি + আচার; hide the old one.
  await db.serviceCategory.updateMany({ where: { shopId: shop.id, slug: "cox-shutki", active: true }, data: { active: false } })
  const cats = Object.fromEntries((await db.serviceCategory.findMany({ where: { shopId: shop.id, flow: "SHOP" } })).map((c) => [c.slug, c.id]))
  // Every shelf is listed under its category (also backfills shelves created before categories existed).
  const groups: Record<string, string> = {}
  for (const [i, g] of SHOP_GROUPS.entries()) {
    const categoryId = cats[GROUP_CATEGORY[g.slug]] ?? null
    const row = await db.productGroup.upsert({ where: { shopId_slug: { shopId: shop.id, slug: g.slug } }, update: { categoryId }, create: { shopId: shop.id, slug: g.slug, name: g.name, nameBn: g.nameBn, sort: i, categoryId } })
    groups[g.slug] = row.id
  }
  // Demo partner stores (HANDYO-managed until a real owner is attached); products without a store are spread across them.
  const stores: string[] = []
  for (const [i, st] of SHOP_STORES.entries()) {
    const cover = bundled(`/demo/shop/stores/${st.slug}.jpg`)
    const row = await db.store.upsert({ where: { shopId_slug: { shopId: shop.id, slug: st.slug } }, update: {}, create: { shopId: shop.id, ...st, photos: cover, status: "APPROVED", sort: i } })
    if (!row.photos && cover) await db.store.update({ where: { id: row.id }, data: { photos: cover } })
    stores.push(row.id)
  }
  if (await db.product.count({ where: { shopId: shop.id } })) {
    const orphans = await db.product.findMany({ where: { shopId: shop.id, storeId: null }, orderBy: { sort: "asc" } })
    for (const [i, p] of orphans.entries()) await db.product.update({ where: { id: p.id }, data: { storeId: stores[i % stores.length] } })
    if (orphans.length) console.log(`Demo shop: ${orphans.length} products attached to stores`)
    return
  }
  let n = 0
  for (const [i, p] of SHOP_PRODUCTS.entries()) {
    const groupId = groups[p.group]
    if (!groupId) continue
    const slug = p.photo.replace(/\.jpg$/, "")
    await db.product.create({
      data: { shopId: shop.id, groupId, storeId: stores[i % stores.length], slug, name: p.name, nameBn: p.nameBn, photos: `/demo/shop/${p.photo}`, badge: p.badge, sort: i, variants: { create: p.variants.map((v, j) => ({ ...v, sort: j })) } },
    })
    n++
  }
  console.log(`Demo shop added: ${n} products in ${SHOP_GROUPS.length} groups across ${stores.length} stores`)
}

/**
 * The per-piece laundry price list: a "HANDYO Laundry" store (can later be handed
 * to a partner by setting its owner in the admin panel), one shelf under the
 * laundry category and a product per garment whose variants are the services.
 * Created once; afterwards only missing/bundled photos are refreshed so prices
 * edited in the panel stay.
 */
async function ensureLaundryItems(shop: { id: string }) {
  const laundry = await db.serviceCategory.findFirst({ where: { shopId: shop.id, slug: "laundry" } })
  if (!laundry) return
  // Hidden offering the per-piece orders book against (the wizard offerings stay as they are).
  await db.serviceOffering.upsert({
    where: { categoryId_slug: { categoryId: laundry.id, slug: "by-item" } },
    update: {},
    create: { categoryId: laundry.id, slug: "by-item", name: "Laundry by item", nameBn: "আইটেম হিসেবে লন্ড্রি", detail: "Pick garments and a service each; priced per piece.", detailBn: "কাপড় বেছে প্রতিটার সার্ভিস দিন; পিস প্রতি দাম।", pricing: "FIXED", price: 0, durationMin: 2880, sort: 99, active: true },
  })
  const group = await db.productGroup.upsert({ where: { shopId_slug: { shopId: shop.id, slug: LAUNDRY_GROUP.slug } }, update: { categoryId: laundry.id }, create: { shopId: shop.id, ...LAUNDRY_GROUP, sort: 50, categoryId: laundry.id } })
  const cover = bundled("/services/laundry.jpg")
  const store = await db.store.upsert({ where: { shopId_slug: { shopId: shop.id, slug: LAUNDRY_STORE.slug } }, update: {}, create: { shopId: shop.id, ...LAUNDRY_STORE, photos: cover, status: "APPROVED", sort: 50 } })
  let n = 0
  let refreshed = 0
  for (const [i, it] of LAUNDRY_ITEMS.entries()) {
    const slug = `laundry-${it.slug}`
    const photo = bundled(`/demo/laundry/${it.slug}.jpg`)
    const have = await db.product.findUnique({ where: { shopId_slug: { shopId: shop.id, slug } } })
    if (have) {
      if (photo && (!have.photos || have.photos.startsWith("/demo/")) && have.photos !== photo) {
        await db.product.update({ where: { id: have.id }, data: { photos: photo } })
        refreshed++
      }
      continue
    }
    await db.product.create({ data: { shopId: shop.id, groupId: group.id, storeId: store.id, slug, name: it.name, nameBn: it.nameBn, photos: photo, badge: it.badge ?? "", sort: i, variants: { create: laundryVariants(it).map((v, j) => ({ ...v, sort: j })) } } })
    n++
  }
  if (n) console.log(`Laundry price list added: ${n} items`)
  if (refreshed) console.log(`Laundry price list: photos refreshed on ${refreshed} items`)
}

async function main() {
  const coxs = await catalog()
  await ensureOwner()
  await syncRentalTypes()
  await ensureDemoVehicles(coxs)
  await ensureDemoProperties(coxs)
  await ensureProductShop(coxs)
  await ensureLaundryItems(coxs)
  if (catalogOnly) return
  await demo(coxs)
  console.log("Logins:")
  for (const a of demoAccounts) console.log(`  ${a.label}: ${a.email} / ${a.password}`)
  for (const s of demoShopStaff) console.log(`  ${s.name}: ${s.email} / ${s.password}`)
  for (const w of demoWorkers) console.log(`  ${w.name}: ${w.email} / ${WORKER_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
