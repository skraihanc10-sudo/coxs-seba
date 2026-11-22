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
  heroBn: "আপনি নিশ্চিন্তে থাকুন, কাজটা আমরা করে দিই।",
  heroEn: "You relax. We get it done.",
  bannerBn: "ঘরে বসেই সব সেবা: লন্ড্রি, ইলেকট্রিশিয়ান, প্লাম্বার, ক্লিনিং আর আরও অনেক কিছু।",
  bannerEn: "Every home service at your door: laundry, electricians, plumbers, cleaning and more.",
  /** Share of the final bill paid to the worker who did the job, in percent. */
  workerShare: "40",
  /** Share of a rental bill paid to the partner who owns the vehicle, in percent. */
  partnerShare: "85",
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
