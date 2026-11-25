/**
 * Per-piece laundry price list. Each garment is a Product on the "laundry-items"
 * shelf of the laundry category; its variants are the services offered for it
 * (wash & iron, iron only, dry clean) with a price each. Photos live in
 * public/demo/laundry. The seed creates them once and only refreshes bundled
 * photos afterwards, so prices edited in the admin panel stay.
 */
export const LAUNDRY_STORE = { slug: "handyo-laundry", nameBn: "HANDYO লন্ড্রি", name: "HANDYO Laundry", addressBn: "কলাতলী, কক্সবাজার", address: "Kolatoli, Cox's Bazar", detailBn: "আমাদের নিজের লন্ড্রি। রাইডার কাপড় নিয়ে যায়, পরিষ্কার করে ফেরত দেয়।", detail: "Our own laundry. A rider collects, we clean, the rider brings it back." }

export const LAUNDRY_GROUP = { slug: "laundry-items", nameBn: "লন্ড্রি আইটেম (পিস প্রতি)", name: "Laundry items (per piece)" }

export const LAUNDRY_SERVICES = { wash: "ওয়াশ ও আয়রন", iron: "শুধু আয়রন", dry: "ড্রাই ক্লিন" } as const

type Item = { slug: string; name: string; nameBn: string; wash?: number; iron?: number; dry?: number; badge?: string }

export const LAUNDRY_ITEMS: Item[] = [
  { slug: "shirt", name: "Shirt", nameBn: "শার্ট", wash: 60, iron: 20, dry: 150, badge: "জনপ্রিয়" },
  { slug: "tshirt", name: "T-shirt", nameBn: "টি-শার্ট", wash: 50, iron: 15 },
  { slug: "pant", name: "Trousers / jeans", nameBn: "প্যান্ট / জিন্স", wash: 70, iron: 25, dry: 180 },
  { slug: "panjabi", name: "Panjabi", nameBn: "পাঞ্জাবি", wash: 80, iron: 30, dry: 250 },
  { slug: "saree", name: "Saree", nameBn: "শাড়ি", wash: 120, iron: 50, dry: 350 },
  { slug: "three-piece", name: "Three-piece", nameBn: "থ্রি-পিস", wash: 120, iron: 40, dry: 300 },
  { slug: "lungi", name: "Lungi", nameBn: "লুঙ্গি", wash: 40, iron: 15 },
  { slug: "school-uniform", name: "School uniform (set)", nameBn: "স্কুল ইউনিফর্ম (সেট)", wash: 60, iron: 25 },
  { slug: "jacket", name: "Jacket", nameBn: "জ্যাকেট", wash: 200, dry: 350 },
  { slug: "suit", name: "Suit / blazer", nameBn: "স্যুট / ব্লেজার", dry: 450 },
  { slug: "bedsheet", name: "Bedsheet (with pillow covers)", nameBn: "বেডশিট (পিলো কভারসহ)", wash: 100, iron: 40 },
  { slug: "towel", name: "Bath towel", nameBn: "টাওয়েল", wash: 40 },
  { slug: "blanket", name: "Blanket / quilt", nameBn: "কম্বল / লেপ", wash: 350, dry: 500 },
  { slug: "curtain", name: "Curtain (per panel)", nameBn: "পর্দা (প্রতি পিস)", wash: 250, dry: 400 },
]

export function laundryVariants(it: Item) {
  const out: Array<{ label: string; price: number; oldPrice: number }> = []
  if (it.wash) out.push({ label: LAUNDRY_SERVICES.wash, price: it.wash, oldPrice: 0 })
  if (it.iron) out.push({ label: LAUNDRY_SERVICES.iron, price: it.iron, oldPrice: 0 })
  if (it.dry) out.push({ label: LAUNDRY_SERVICES.dry, price: it.dry, oldPrice: 0 })
  return out
}
