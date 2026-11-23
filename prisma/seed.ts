/**
 * Seeds HANDYO. Safe to run again: everything is created only when it is
 * missing, and nothing the admin edited is overwritten.
 *   tsx prisma/seed.ts            shops + catalog + demo accounts + demo bookings
 *   tsx prisma/seed.ts --catalog  default shop, its areas, services, FAQs, templates, settings only
 */
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { AREAS, CATEGORIES, DHAKA_AREAS, FAQS, REPLY_TEMPLATES, SHOPS } from "./catalog"
import { demoAccounts, demoShopStaff, demoWorkers, WORKER_PASSWORD } from "../src/theme/demo-accounts"
import { SETTING_DEFAULTS } from "../src/lib/settings"

const db = new PrismaClient()
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
  if (existing) return existing
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
    const current = await db.serviceCategory.findUnique({ where: { shopId_slug: { shopId, slug: c.slug } }, select: { image: true } })
    const refreshImage = current && (!current.image || current.image.startsWith("/services/")) && current.image !== cat.image
    const row = await db.serviceCategory.upsert({ where: { shopId_slug: { shopId, slug: c.slug } }, update: refreshImage ? { image: cat.image } : {}, create: { ...cat, shopId, sort: i } })
    for (const [j, o] of offerings.entries()) {
      await db.serviceOffering.upsert({
        where: { categoryId_slug: { categoryId: row.id, slug: o.slug } },
        update: {},
        create: { ...o, minQty: o.minQty ?? 1, categoryId: row.id, sort: j },
      })
    }
  }
  if ((await db.replyTemplate.count({ where: { shopId } })) === 0) {
    await db.replyTemplate.createMany({ data: REPLY_TEMPLATES.map((t, i) => ({ ...t, shopId, sort: i })) })
  }
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await db.setting.upsert({ where: { shopId_key: { shopId, key } }, update: {}, create: { shopId, key, value } })
  }
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
  const vehicles: Array<{ key: string; type: string; owner: string | null; title: string; titleBn: string; plate: string; seats: number; hour: number; day: number; half?: number; specs?: string; minHours: number; detail: string; detailBn: string; status: string }> = [
    { key: "noah", type: "car-daily", owner: null, title: "Toyota Noah 2018 (AC)", titleBn: "টয়োটা নোয়া ২০১৮ (এসি)", plate: "Cox-Ga-11-2233", seats: 7, hour: 600, day: 4000, half: 2500, specs: "7 seats, AC, Driver included", minHours: 2, detail: "Driver and fuel included inside town; Inani/Himchari day trips.", detailBn: "ড্রাইভার ও তেলসহ, শহরের মধ্যে; ইনানী-হিমছড়ি ডে ট্রিপ।", status: "APPROVED" },
    { key: "jeep", type: "open-roof-jeep", owner: null, title: "Open-roof Marine Drive jeep", titleBn: "ছাদখোলা মেরিন ড্রাইভ জিপ", plate: "Cox-Tha-12-4455", seats: 8, hour: 0, day: 4500, half: 2800, specs: "Open roof, 8 seats, Driver included", minHours: 1, detail: "Open-roof jeep for the Marine Drive run to Inani, with driver.", detailBn: "মেরিন ড্রাইভ ধরে ইনানী পর্যন্ত ছাদখোলা জিপ, ড্রাইভারসহ।", status: "APPROVED" },
    { key: "scooter", type: "scooter-bike", owner: "partner.rony@needcoxs.test", title: "Yamaha Ray ZR scooter", titleBn: "ইয়ামাহা রে ZR স্কুটার", plate: "Cox-Ha-21-7788", seats: 2, hour: 150, day: 800, half: 500, specs: "125cc, Automatic, 2 helmets", minHours: 2, detail: "Self-drive, two helmets, licence required. Fuel extra.", detailBn: "নিজে চালাবেন, দুইটা হেলমেট, লাইসেন্স লাগবে। তেল আলাদা।", status: "APPROVED" },
    { key: "premio", type: "car-hourly", owner: "partner.rony@needcoxs.test", title: "Toyota Premio 2016 (AC)", titleBn: "টয়োটা প্রিমিও ২০১৬ (এসি)", plate: "Cox-Ga-14-9911", seats: 4, hour: 500, day: 3500, half: 2000, specs: "AC, 4 seats, Driver included", minHours: 2, detail: "AC sedan with driver and fuel, inside town.", detailBn: "এসি সেডান, ড্রাইভার ও তেলসহ, শহরের মধ্যে।", status: "APPROVED" },
    { key: "hiace", type: "microbus", owner: "partner.rony@needcoxs.test", title: "Toyota Hiace microbus (11 seats)", titleBn: "টয়োটা হাইয়েস মাইক্রোবাস (১১ সিট)", plate: "Cox-Cha-11-3344", seats: 11, hour: 900, day: 6500, minHours: 3, detail: "For groups: Teknaf, Inani, Ramu day tours.", detailBn: "গ্রুপের জন্য: টেকনাফ, ইনানী, রামু ডে ট্যুর।", status: "PENDING" },
  ]
  for (const [i, v] of vehicles.entries()) {
    const offering = rentalOfferings[v.type]
    if (!offering) continue
    const existing = await db.vehicle.findFirst({ where: { shopId: coxs.id, plate: v.plate } })
    if (existing) {
      // Older rows: fill the newer marketplace fields once, never overwrite edits.
      if (!existing.specs && !existing.pricePerHalfDay) await db.vehicle.update({ where: { id: existing.id }, data: { specs: v.specs ?? "", pricePerHalfDay: v.half ?? 0 } })
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
  if (!category || (await db.vehicle.count({ where: { shopId: shop.id } }))) return
  const byType = Object.fromEntries(category.offerings.map((o) => [o.slug, o.id]))
  const fleet = [
    { type: "scooter-bike", photo: "bike-fz", title: "Yamaha FZS V3", titleBn: "ইয়ামাহা FZS V3", seats: 2, hour: 300, half: 1000, day: 2200, minHours: 2, specs: "149cc, Fuel injection, Dual-channel ABS", detail: "Premium handling for long-distance highway cruises. Two helmets included.", detailBn: "হাইওয়ে আর মেরিন ড্রাইভের জন্য আরামের বাইক। দুইটা হেলমেট সহ।" },
    { type: "scooter-bike", photo: "bike-gixxer", title: "Suzuki Gixxer SF", titleBn: "সুজুকি Gixxer SF", seats: 2, hour: 350, half: 1000, day: 2300, minHours: 2, specs: "155cc, Full fairing, Rear disc brake", detail: "Sporty ride for the Marine Drive run to Inani and Teknaf.", detailBn: "স্পোর্টি রাইড, মেরিন ড্রাইভ ধরে ইনানী-টেকনাফ।" },
    { type: "scooter-bike", photo: "bike-r15", title: "Yamaha R15 V4", titleBn: "ইয়ামাহা R15 V4", seats: 2, hour: 400, half: 1200, day: 2800, minHours: 2, specs: "155cc, Liquid cooled, ABS", detail: "The fast one. Licence required, self-drive only.", detailBn: "সবচেয়ে ফাস্ট। লাইসেন্স লাগবে, নিজে চালাবেন।" },
    { type: "car-hourly", photo: "car-allion", title: "Toyota Allion (AC)", titleBn: "টয়োটা অ্যালিয়ন (এসি)", seats: 4, hour: 500, half: 2200, day: 3800, minHours: 2, specs: "AC, 4 seats, Driver included", detail: "AC sedan with driver and fuel, inside town and to the airport.", detailBn: "এসি সেডান, ড্রাইভার ও তেলসহ, শহরের মধ্যে ও এয়ারপোর্ট।" },
    { type: "car-daily", photo: "car-swift", title: "Suzuki Swift (AC)", titleBn: "সুজুকি সুইফট (এসি)", seats: 4, hour: 450, half: 2000, day: 3200, minHours: 2, specs: "AC, Compact, Driver included", detail: "Small and easy in beach-road traffic. Driver and fuel included.", detailBn: "ছোট গাড়ি, বিচ রোডের জ্যামে সুবিধা। ড্রাইভার ও তেলসহ।" },
    { type: "car-daily", photo: "car-fortuner", title: "Toyota Fortuner (AC)", titleBn: "টয়োটা ফরচুনার (এসি)", seats: 7, hour: 900, half: 4000, day: 7000, minHours: 3, specs: "AC, 7 seats, 4x4, Driver included", detail: "Big SUV for families: Inani, Himchari, Teknaf day trips.", detailBn: "পরিবারের জন্য বড় SUV: ইনানী, হিমছড়ি, টেকনাফ ডে ট্রিপ।" },
    { type: "open-roof-jeep", photo: "jeep-crv", title: "Marine Drive jeep (open roof)", titleBn: "মেরিন ড্রাইভ জিপ (ছাদখোলা)", seats: 8, hour: 0, half: 2800, day: 4500, minHours: 1, specs: "Open roof, 8 seats, Driver included", detail: "Open-roof jeep from Kolatoli along Marine Drive to Inani, with driver.", detailBn: "কলাতলী থেকে মেরিন ড্রাইভ ধরে ইনানী, ড্রাইভারসহ ছাদখোলা জিপ।" },
    { type: "microbus", photo: "micro-hiace", title: "Toyota Hiace microbus (11 seats)", titleBn: "টয়োটা হাইয়েস মাইক্রোবাস (১১ সিট)", seats: 11, hour: 900, half: 4000, day: 6500, minHours: 3, specs: "AC, 11 seats, Driver included", detail: "For groups: Teknaf, Inani, Ramu day tours with driver and fuel.", detailBn: "গ্রুপের জন্য: টেকনাফ, ইনানী, রামু ডে ট্যুর, ড্রাইভার ও তেলসহ।" },
  ]
  let n = 0
  for (const [i, v] of fleet.entries()) {
    const offeringId = byType[v.type] ?? category.offerings[0]?.id
    if (!offeringId) continue
    await db.vehicle.create({
      data: { shopId: shop.id, offeringId, title: v.title, titleBn: v.titleBn, seats: v.seats, photos: `/demo/vehicles/${v.photo}.jpg`, pricePerHour: v.hour, pricePerHalfDay: v.half, pricePerDay: v.day, minHours: v.minHours, specs: v.specs, detail: v.detail, detailBn: v.detailBn, status: "APPROVED", sort: i },
    })
    n++
  }
  console.log(`Demo fleet added: ${n} vehicles with stock photos`)
}

async function main() {
  const coxs = await catalog()
  await ensureOwner()
  await ensureDemoVehicles(coxs)
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
