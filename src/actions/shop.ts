"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { run, type ActionState } from "@/lib/action"
import { actor, clientIp, getUser, setSession } from "@/lib/auth"
import { AppError } from "@/lib/errors"
import { normalisePhone } from "@/lib/format"
import { limited } from "@/lib/rate-limit"
import { verifyOtp } from "@/lib/otp"
import { saveImages } from "@/lib/uploads"
import { ADMINS } from "@/lib/roles"
import { currentShop, officeShopId } from "@/lib/shops"
import { formObject, parse, productGroupSchema, productSchema, shopOrderSchema, storeSchema } from "@/lib/validation"
import { createShopOrder, parcelsOf, parseCart, partnerStore, priceCart, reviewStore, saveGroup, savePartnerStore, saveProduct, saveShopStore, toggleProduct } from "@/lib/shop"
import { customerByPhone } from "@/actions/auth"

/* ---------- admin ---------- */

export async function saveProductAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const input = parse(productSchema, formObject(form))
    const photos = await saveImages(form.getAll("photos"), 4)
    await saveProduct(shopId, input.id || undefined, { ...input, storeId: input.storeId || null }, photos)
    revalidatePath("/admin/products")
    revalidatePath("/services")
    return "প্রোডাক্ট সেভ হয়েছে।"
  })
}

export async function toggleProductAction(form: FormData) {
  const me = await actor(ADMINS)
  const shopId = await officeShopId(me)
  await toggleProduct(shopId, String(form.get("id") ?? ""))
  revalidatePath("/admin/products")
  revalidatePath("/services")
}

export async function saveGroupAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const input = parse(productGroupSchema, formObject(form))
    await saveGroup(shopId, input.id || undefined, { ...input, categoryId: String(form.get("categoryId") ?? "") || null })
    revalidatePath("/admin/products")
    revalidatePath("/services")
    return "শেলফ সেভ হয়েছে।"
  })
}

export async function saveStoreAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const input = parse(storeSchema, formObject(form))
    const photos = await saveImages(form.getAll("photos"), 2)
    await saveShopStore(shopId, input.id || undefined, { ...input, workerId: input.workerId || null }, photos)
    revalidatePath("/admin/stores")
    revalidatePath("/services")
    return "দোকান সেভ হয়েছে।"
  })
}

export async function reviewStoreAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const decision = String(form.get("decision") ?? "")
    if (!["APPROVE", "REJECT", "PAUSE", "RESUME"].includes(decision)) throw new AppError("সিদ্ধান্ত ঠিক নেই।", "Bad decision.")
    await reviewStore(shopId, String(form.get("id") ?? ""), decision as "APPROVE" | "REJECT" | "PAUSE" | "RESUME", String(form.get("note") ?? ""))
    revalidatePath("/admin/stores")
    revalidatePath("/admin/workers")
    revalidatePath("/services")
    return decision === "APPROVE" ? "অনুমোদন দেওয়া হয়েছে, দোকান এখন সাইটে।" : decision === "REJECT" ? "আবেদন বাতিল করা হয়েছে।" : "ঠিক আছে।"
  })
}

/* ---------- partner (store owner) ---------- */

async function partner() {
  const user = await actor(["WORKER"])
  if (!user.worker) throw new AppError("পার্টনার প্রোফাইল পাওয়া যায়নি।", "Partner profile not found.")
  return { ...user, worker: user.worker }
}

export async function partnerStoreAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await partner()
    const input = parse(storeSchema, formObject(form))
    const photos = await saveImages(form.getAll("photos"), 2)
    await savePartnerStore({ id: me.worker.id, shopId: me.worker.shopId }, input, photos)
    revalidatePath("/worker/store")
    revalidatePath("/services")
    return "দোকানের তথ্য সেভ হয়েছে।"
  })
}

/** Partner adds or edits a product of their own store. */
export async function partnerProductAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await partner()
    const store = await partnerStore(me.worker.id)
    if (!store) throw new AppError("আগে দোকানের তথ্য দিন।", "Set up your store first.")
    if (store.status !== "APPROVED" && store.status !== "PAUSED") throw new AppError("দোকান অনুমোদনের পর পণ্য যোগ করা যাবে।", "You can add products once the store is approved.")
    const input = parse(productSchema, formObject(form))
    const photos = await saveImages(form.getAll("photos"), 4)
    await saveProduct(me.worker.shopId, input.id || undefined, input, photos, store.id)
    revalidatePath("/worker/store")
    revalidatePath("/services")
    return input.id ? "প্রোডাক্ট সেভ হয়েছে।" : "প্রোডাক্ট যোগ হয়েছে, সাইটে দেখাচ্ছে।"
  })
}

export async function partnerToggleProductAction(form: FormData) {
  const me = await partner()
  const store = await partnerStore(me.worker.id)
  if (!store) return
  await toggleProduct(me.worker.shopId, String(form.get("id") ?? ""), store.id)
  revalidatePath("/worker/store")
  revalidatePath("/services")
}

/* ---------- customer ---------- */

/** Checkout: price the browser cart against the database and group it into parcels per store. */
export async function priceCartAction(cartJson: string): Promise<{ parcels: Array<{ storeId: string; storeName: string; storeNameBn: string; subtotal: number; items: Array<{ variantId: string; productId: string; name: string; nameBn: string; label: string; unitPrice: number; qty: number; lineTotal: number; photo: string }> }>; error?: string }> {
  try {
    const shop = await currentShop()
    return { parcels: parcelsOf(await priceCart(shop.id, parseCart(cartJson))) }
  } catch (error) {
    return { parcels: [], error: error instanceof AppError ? error.message : "কার্ট যাচাই করা যায়নি।" }
  }
}

/** Place the order(s). Guests verify their phone with the OTP, which also signs them in. */
export async function createShopOrderAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const input = parse(shopOrderSchema, formObject(form))
  const phone = normalisePhone(input.phone)
  if (!phone) return { ok: false, error: "সঠিক মোবাইল নম্বর দিন (০১ দিয়ে শুরু, ১১ সংখ্যা)।", at: Date.now() }
  const out: { created?: Array<{ code: string }>; signedIn?: { id: string; role: string; name: string } } = {}
  const state = await run(async () => {
    limited("booking", await clientIp())
    const shop = await currentShop()
    let customer = await getUser()
    if (customer && customer.role !== "CUSTOMER") throw new AppError("অর্ডার দিতে কাস্টমার অ্যাকাউন্টে ঢুকুন।", "Please use a customer account to order.")
    if (!customer) {
      if (!input.otp) throw new AppError("মোবাইলে পাঠানো কোডটা দিন।", "Enter the code we sent to your phone.")
      const verified = await verifyOtp(phone, input.otp)
      customer = { ...(await customerByPhone(verified, input.name || input.contactName)), worker: null, shop: null }
      out.signedIn = customer
    }
    out.created = await createShopOrder(shop.id, customer, { ...input, phone, cart: parseCart(input.cart) })
  })
  if (!state.ok || !out.created?.length) return state
  if (out.signedIn) await setSession(out.signedIn)
  const more = out.created.slice(1).map((c) => c.code).join(",")
  redirect(`/bookings/${out.created[0].code}?new=1${more ? `&more=${more}` : ""}`)
}
