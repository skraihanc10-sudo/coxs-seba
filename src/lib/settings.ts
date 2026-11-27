import { db } from "./db"
import { brand } from "../theme/brand"

/** Everything a shop admin can change from Settings. Stored as key/value rows per shop. */
export const SETTING_DEFAULTS: Record<string, string> = {
  helpline: brand.supportPhone,
  whatsapp: brand.whatsapp,
  emergency: brand.emergencyPhone,
  supportEmail: brand.supportEmail,
  /** Social links shown in the footer; leave empty to hide the icon. */
  facebook: "https://facebook.com/handyobd",
  youtube: "https://youtube.com/@handyobd",
  /** Home page: YouTube links of customer video reviews (one per line) and uploaded review screenshots (file names). */
  reviewVideos: "",
  reviewShots: "",
  officeHours: "প্রতিদিন সকাল ৮টা – রাত ১০টা",
  officeHoursEn: "Every day, 8 am – 10 pm",
  address: brand.addressBn,
  addressEn: brand.address,
  heroBn: "যা দরকার, ভরসায় বুক করুন।",
  heroEn: "Book what you need, with confidence.",
  bannerBn: "শিপ টিকিট, গাড়ি-রিসোর্ট বুকিং, ঘরের সেবা আর শুঁটকি-আচার – যাচাই করা পার্টনার, দাম আগেই, সারা দেশে।",
  bannerEn: "Ship tickets, car and resort booking, home services and dried fish: verified partners, prices up front, nationwide.",
  /** Share of the final bill paid to the worker who did the job, in percent. */
  workerShare: "40",
  /** Share of a partner's bill (vehicle, resort, store) paid to the partner. */
  partnerShare: "90",
  /** Product shop: flat delivery charge, free-delivery threshold (0 = never), minimum order. */
  shopDelivery: "130",
  shopFreeAbove: "0",
  shopMinOrder: "400",
  /** Per-piece laundry: rider pickup + return charge, free above, minimum order. */
  laundryDelivery: "50",
  laundryFreeAbove: "500",
  laundryMinOrder: "150",
  payCash: "1",
  payBkash: "1",
  payNagad: "1",
}

export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS)

export type Settings = Record<string, string>

/** Settings of one shop, with defaults filled in. */
export async function getSettings(shopId: string): Promise<Settings> {
  const rows = await db.setting.findMany({ where: { shopId } })
  const map = { ...SETTING_DEFAULTS }
  for (const row of rows) map[row.key] = row.value
  return map
}

export async function saveSettings(shopId: string, entries: Record<string, string>) {
  const known = Object.entries(entries).filter(([key]) => SETTING_KEYS.includes(key))
  await db.$transaction(
    known.map(([key, value]) =>
      db.setting.upsert({ where: { shopId_key: { shopId, key } }, update: { value }, create: { shopId, key, value } }),
    ),
  )
}
