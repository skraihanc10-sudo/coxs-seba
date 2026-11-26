"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { run, type ActionState } from "@/lib/action"
import { actor, clientIp, getLocale, getUser, setSession } from "@/lib/auth"
import { AppError } from "@/lib/errors"
import { normalisePhone } from "@/lib/format"
import { limited } from "@/lib/rate-limit"
import { verifyOtp } from "@/lib/otp"
import { saveImages } from "@/lib/uploads"
import { ADMINS } from "@/lib/roles"
import { officeShopId } from "@/lib/shops"
import { formObject, parse, propertySchema, stayBookingSchema } from "@/lib/validation"
import { createStayBooking, liveProperty, quoteStay, reviewProperty, savePartnerProperty, saveShopProperty, togglePartnerProperty } from "@/lib/stays"
import { customerByPhone } from "@/actions/auth"

async function partner() {
  const user = await actor(["WORKER"])
  if (!user.worker) throw new AppError("পার্টনার প্রোফাইল পাওয়া যায়নি।", "Partner profile not found.")
  return { ...user, worker: user.worker }
}

/** Partner: add a property (goes to admin for approval) or edit one of theirs. */
export async function partnerPropertyAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await partner()
    const input = parse(propertySchema, formObject(form))
    const photos = await saveImages(form.getAll("photos"), 6)
    await savePartnerProperty({ id: me.worker.id, shopId: me.worker.shopId }, input.id || undefined, input, photos)
    revalidatePath("/worker/stays")
    revalidatePath("/services")
    return input.id ? "রিসোর্টের তথ্য সেভ হয়েছে।" : "রিসোর্ট যোগ হয়েছে, অ্যাডমিনের অনুমোদনের পর সাইটে দেখাবে।"
  })
}

export async function togglePartnerPropertyAction(form: FormData) {
  const me = await partner()
  await togglePartnerProperty({ id: me.worker.id }, String(form.get("id") ?? ""))
  revalidatePath("/worker/stays")
  revalidatePath("/services")
}

/** Admin: add a HANDYO-managed property or edit any property of the shop. */
export async function savePropertyAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const input = parse(propertySchema, formObject(form))
    const photos = await saveImages(form.getAll("photos"), 6)
    await saveShopProperty(shopId, input.id || undefined, { ...input, workerId: input.workerId || null }, photos)
    revalidatePath("/admin/stays")
    revalidatePath("/services")
    return "রিসোর্ট সেভ হয়েছে।"
  })
}

/** Admin: approve / reject / pause / resume a property. */
export async function reviewPropertyAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const decision = String(form.get("decision") ?? "")
    if (!["APPROVE", "REJECT", "PAUSE", "RESUME"].includes(decision)) throw new AppError("সিদ্ধান্ত ঠিক নেই।", "Bad decision.")
    await reviewProperty(shopId, String(form.get("id") ?? ""), decision as "APPROVE" | "REJECT" | "PAUSE" | "RESUME", String(form.get("note") ?? ""))
    revalidatePath("/admin/stays")
    revalidatePath("/admin/workers")
    revalidatePath("/services")
    return decision === "APPROVE" ? "অনুমোদন দেওয়া হয়েছে, রিসোর্ট এখন সাইটে দেখাচ্ছে।" : decision === "REJECT" ? "আবেদন বাতিল করা হয়েছে।" : "ঠিক আছে।"
  })
}

/** Wizard: live availability + price for a room type and date range. */
export async function checkStayAction(form: FormData): Promise<{ ok: boolean; nights?: number; total?: number; available?: number; error?: string }> {
  try {
    const locale = await getLocale()
    const property = await liveProperty(String(form.get("propertyId") ?? ""))
    const room = property?.rooms.find((r) => r.id === String(form.get("roomTypeId") ?? "") && r.active)
    if (!property || !room) return { ok: false, error: locale === "bn" ? "রুমটা পাওয়া যায়নি।" : "Room not found." }
    const q = await quoteStay(room, String(form.get("checkIn") ?? ""), String(form.get("checkOut") ?? ""), Number(form.get("rooms") ?? 1), Number(form.get("guests") ?? 1))
    return { ok: true, nights: q.nights, total: q.total, available: q.available }
  } catch (error) {
    if (error instanceof AppError) return { ok: false, error: (await getLocale()) === "bn" ? error.message : error.en }
    return { ok: false, error: "যাচাই করা যায়নি।" }
  }
}

/** Place a stay booking. A guest verifies their phone with the OTP, which also signs them in. */
export async function createStayBookingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const input = parse(stayBookingSchema, formObject(form))
  const phone = normalisePhone(input.phone)
  if (!phone) return { ok: false, error: "সঠিক মোবাইল নম্বর দিন (০১ দিয়ে শুরু, ১১ সংখ্যা)।", at: Date.now() }
  const out: { created?: { code: string }; signedIn?: { id: string; role: string; name: string } } = {}
  const state = await run(async () => {
    limited("booking", await clientIp())
    let customer = await getUser()
    if (customer && customer.role !== "CUSTOMER") throw new AppError("বুকিং দিতে কাস্টমার অ্যাকাউন্টে ঢুকুন।", "Please use a customer account to book.")
    if (!customer) {
      if (!input.otp) throw new AppError("মোবাইলে পাঠানো কোডটা দিন।", "Enter the code we sent to your phone.")
      const verified = await verifyOtp(phone, input.otp)
      customer = { ...(await customerByPhone(verified, input.name || input.contactName)), worker: null, shop: null }
      out.signedIn = customer
    }
    out.created = await createStayBooking(customer, { ...input, phone })
  })
  if (!state.ok || !out.created) return state
  if (out.signedIn) await setSession(out.signedIn)
  redirect(`/bookings/${out.created.code}?new=1`)
}
