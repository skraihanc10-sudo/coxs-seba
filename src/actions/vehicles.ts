"use server"

import { revalidatePath } from "next/cache"
import { run, type ActionState } from "@/lib/action"
import { actor } from "@/lib/auth"
import { AppError } from "@/lib/errors"
import { saveImages } from "@/lib/uploads"
import { ADMINS } from "@/lib/roles"
import { officeShopId } from "@/lib/shops"
import { formObject, parse, vehicleSchema } from "@/lib/validation"
import { reviewVehicle, savePartnerVehicle, saveShopVehicle, togglePartnerVehicle } from "@/lib/vehicles"

async function partner() {
  const user = await actor(["WORKER"])
  if (!user.worker) throw new AppError("কর্মী প্রোফাইল পাওয়া যায়নি।", "Worker profile not found.")
  return { ...user, worker: user.worker }
}

/** Partner: add another vehicle (goes to admin for approval) or edit one of theirs. */
export async function partnerVehicleAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await partner()
    const input = parse(vehicleSchema, formObject(form))
    const photos = await saveImages(form.getAll("photos"), 4)
    await savePartnerVehicle({ id: me.worker.id, shopId: me.worker.shopId }, input.id || undefined, input, photos)
    revalidatePath("/worker/vehicles")
    revalidatePath("/services")
    return input.id ? "গাড়ির তথ্য সেভ হয়েছে।" : "গাড়ি যোগ হয়েছে, অ্যাডমিনের অনুমোদনের পর সাইটে দেখাবে।"
  })
}

/** Partner: hide or show one of their live vehicles. */
export async function togglePartnerVehicleAction(form: FormData) {
  const me = await partner()
  await togglePartnerVehicle({ id: me.worker.id }, String(form.get("id") ?? ""))
  revalidatePath("/worker/vehicles")
  revalidatePath("/services")
}

/** Admin: add a shop-owned vehicle or edit any vehicle of the shop. */
export async function saveVehicleAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const input = parse(vehicleSchema, formObject(form))
    const photos = await saveImages(form.getAll("photos"), 4)
    await saveShopVehicle(shopId, input.id || undefined, { ...input, workerId: input.workerId || null }, photos)
    revalidatePath("/admin/vehicles")
    revalidatePath("/services")
    return "গাড়ি সেভ হয়েছে।"
  })
}

/** Admin: approve / reject / pause / resume a vehicle. Approving also switches the partner's login on. */
export async function reviewVehicleAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const decision = String(form.get("decision") ?? "")
    if (!["APPROVE", "REJECT", "PAUSE", "RESUME"].includes(decision)) throw new AppError("সিদ্ধান্ত ঠিক নেই।", "Bad decision.")
    await reviewVehicle(shopId, String(form.get("id") ?? ""), decision as "APPROVE" | "REJECT" | "PAUSE" | "RESUME", String(form.get("note") ?? ""))
    revalidatePath("/admin/vehicles")
    revalidatePath("/admin/workers")
    revalidatePath("/services")
    return decision === "APPROVE" ? "অনুমোদন দেওয়া হয়েছে, গাড়ি এখন সাইটে দেখাচ্ছে।" : decision === "REJECT" ? "আবেদন বাতিল করা হয়েছে।" : "ঠিক আছে।"
  })
}
