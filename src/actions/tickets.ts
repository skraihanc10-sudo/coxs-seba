"use server"

import { revalidatePath } from "next/cache"
import { run, type ActionState } from "@/lib/action"
import { actor } from "@/lib/auth"
import { AppError } from "@/lib/errors"
import type { Role } from "@/lib/roles"
import { saveImages } from "@/lib/uploads"
import { addStock, reviewStock, updateStock } from "@/lib/tickets"

/** Agent: "I hold N tickets of this type" (goes to the office for approval). */
export async function addStockAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(["WORKER"])
    const photos = await saveImages(form.getAll("photos"), 2)
    await addStock(user, { offeringId: String(form.get("offeringId") ?? ""), qty: Number(form.get("qty")), note: String(form.get("note") ?? "") }, photos)
    revalidatePath("/worker/tickets")
    return "স্টক জমা হয়েছে; অফিস অনুমোদন দিলে সাইটে বিক্রি শুরু হবে।"
  })
}

/** Agent: change the number held. */
export async function updateStockQtyAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(["WORKER"])
    await updateStock(user, String(form.get("id") ?? ""), { qty: Number(form.get("qty")) })
    revalidatePath("/worker/tickets")
    revalidatePath("/services")
    return "স্টক আপডেট হয়েছে।"
  })
}

/** Agent: stock out (pause) or resume. */
export async function toggleStockAction(form: FormData) {
  const user = await actor(["WORKER"])
  await updateStock(user, String(form.get("id") ?? ""), { toggle: true })
  revalidatePath("/worker/tickets")
  revalidatePath("/services")
}

/** Office: approve / reject / pause / resume an agent's stock. */
export async function reviewStockAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(["ADMIN", "OWNER"])
    const decision = String(form.get("decision") ?? "")
    if (!["APPROVE", "REJECT", "PAUSE", "RESUME"].includes(decision)) throw new AppError("সিদ্ধান্ত ঠিক নেই।", "Bad decision.")
    await reviewStock({ ...user, role: user.role as Role }, String(form.get("id") ?? ""), decision as "APPROVE" | "REJECT" | "PAUSE" | "RESUME", String(form.get("note") ?? ""))
    revalidatePath("/admin/tickets")
    revalidatePath("/services")
    return decision === "APPROVE" ? "অনুমোদন দেওয়া হয়েছে, টিকিট এখন বিক্রি হচ্ছে।" : decision === "REJECT" ? "নাকচ করা হয়েছে।" : "ঠিক আছে।"
  })
}
