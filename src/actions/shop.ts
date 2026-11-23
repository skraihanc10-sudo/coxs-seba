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
import { formObject, parse, productGroupSchema, productSchema, shopOrderSchema } from "@/lib/validation"
import { createShopOrder, parseCart, priceCart, saveGroup, saveProduct, toggleProduct } from "@/lib/shop"
import { customerByPhone } from "@/actions/auth"

/** Admin: create or edit a product of their shop. */
export async function saveProductAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const input = parse(productSchema, formObject(form))
    const photos = await saveImages(form.getAll("photos"), 4)
    await saveProduct(shopId, input.id || undefined, input, photos)
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
    await saveGroup(shopId, input.id || undefined, input)
    revalidatePath("/admin/products")
    revalidatePath("/services")
    return "গ্রুপ সেভ হয়েছে।"
  })
}

/** Checkout: price the browser cart against the database (drops lines no longer sold). */
export async function priceCartAction(cartJson: string): Promise<{ lines: Array<{ variantId: string; productId: string; name: string; nameBn: string; label: string; unitPrice: number; qty: number; lineTotal: number; photo: string }>; error?: string }> {
  try {
    const shop = await currentShop()
    return { lines: await priceCart(shop.id, parseCart(cartJson)) }
  } catch (error) {
    return { lines: [], error: error instanceof AppError ? error.message : "কার্ট যাচাই করা যায়নি।" }
  }
}

/** Place a shop order. Guests verify their phone with the OTP, which also signs them in. */
export async function createShopOrderAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const input = parse(shopOrderSchema, formObject(form))
  const phone = normalisePhone(input.phone)
  if (!phone) return { ok: false, error: "সঠিক মোবাইল নম্বর দিন (০১ দিয়ে শুরু, ১১ সংখ্যা)।", at: Date.now() }
  const out: { created?: { code: string }; signedIn?: { id: string; role: string; name: string } } = {}
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
  if (!state.ok || !out.created) return state
  if (out.signedIn) await setSession(out.signedIn)
  redirect(`/bookings/${out.created.code}?new=1&cart=clear`)
}
