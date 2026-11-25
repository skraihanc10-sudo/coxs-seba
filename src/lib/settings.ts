import { db } from "./db"
import { brand } from "../theme/brand"

/** Everything a shop admin can change from Settings. Stored as key/value rows per shop. */
export const SETTING_DEFAULTS: Record<string, string> = {
  helpline: brand.supportPhone,
  whatsapp: brand.whatsapp,
  emergency: brand.emergencyPhone,
  supportEmail: brand.supportEmail,
  officeHours: "প্রতিদিন সকাল ৮টা – রাত ১০টা",
  officeHoursEn: "Every day, 8 am – 10 pm",
  address: brand.addressBn,
  addressEn: brand.address,
  heroBn: "কক্সবাজারে যা দরকার, সব HANDYO-তে।",
  heroEn: "Everything you need in Cox's Bazar, on HANDYO.",
  bannerBn: "ঘরের সেবা, গাড়ি-বাইক ভাড়া, রিসোর্ট বুকিং আর কক্সবাজারের শুঁটকি-আচার – এক অ্যাপে, দাম আগেই জানা।",
  bannerEn: "Home services, car & bike rental, resort booking and Cox's Bazar dried fish & pickles: one app, prices up front.",
  /** Share of the final bill paid to the worker who did the job, in percent. */
  workerShare: "40",
  /** Share of a partner's bill (vehicle, resort, store) paid to the partner; HANDYO keeps the rest (10 %). */
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
