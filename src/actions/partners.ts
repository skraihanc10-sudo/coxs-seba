"use server"

import { revalidatePath } from "next/cache"
import { run, type ActionState } from "@/lib/action"
import { actor, clientIp, getUser } from "@/lib/auth"
import { limited } from "@/lib/rate-limit"
import { saveDocuments } from "@/lib/uploads"
import { currentShop } from "@/lib/shops"
import { formObject, parse, partnerSignupSchema } from "@/lib/validation"
import { AppError } from "@/lib/errors"
import type { Role } from "@/lib/roles"
import { adjustBill } from "@/lib/bookings"
import { addHelper, createRequest, decideRequest, partnerSignup, reviewHelper, reviewPartner, setOfficeList } from "@/lib/partners"

/** Public: become a partner (account + ID papers + category). The office approves the person. */
export async function partnerSignupAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    limited("partner", await clientIp())
    if (await getUser()) throw new AppError("আপনি লগইন করা আছেন। নতুন পার্টনার হতে আগে লগআউট করুন।", "You are signed in. Log out first to sign up as a partner.")
    const input = parse(partnerSignupSchema, formObject(form))
    const shop = await currentShop()
    const idPhotos = await saveDocuments(form.getAll("idPhotos"), 2)
    await partnerSignup(shop.id, input, idPhotos)
    return "আবেদন জমা হয়েছে। HANDYO অফিস কাগজ দেখে অনুমোদন দিলে এই মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে লগইন করে পণ্য/গাড়ি/রিসোর্ট যোগ করতে পারবেন।"
  })
}

/** Office: approve or reject a partner application. */
export async function reviewPartnerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(["ADMIN", "OWNER"])
    const decision = String(form.get("decision") ?? "")
    if (decision !== "APPROVE" && decision !== "REJECT") throw new AppError("সিদ্ধান্ত ঠিক নেই।", "Bad decision.")
    await reviewPartner({ ...user, role: user.role as Role }, String(form.get("id") ?? ""), decision, String(form.get("note") ?? ""))
    revalidatePath("/admin", "layout")
    return decision === "APPROVE" ? "পার্টনার অনুমোদিত, এখন লগইন করতে পারবে।" : "আবেদন নাকচ করা হয়েছে।"
  })
}

function code(form: FormData) {
  const value = String(form.get("code") ?? "").trim()
  if (!/^[A-Z]{2,3}-\d{5,8}$/.test(value)) throw new AppError("বুকিং নম্বর ঠিক নেই।", "Bad booking number.")
  return value
}

/** Office: add or take money off a bill directly. */
export async function adjustBillAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(["ADMIN", "OWNER"])
    const bill = await adjustBill({ ...user, role: user.role as Role }, code(form), Number(form.get("extraCharge")), String(form.get("note") ?? ""))
    revalidatePath("/", "layout")
    return `বিল আপডেট হয়েছে: ৳${bill}`
  })
}

/** Partner asks for an extra charge on an order. */
export async function requestExtraAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(["WORKER"])
    await createRequest({ ...user, role: user.role as Role }, code(form), "EXTRA", Number(form.get("amount")), String(form.get("note") ?? ""))
    revalidatePath("/", "layout")
    return "অনুরোধ অফিসে গেছে; অনুমোদন হলে বিলে যোগ হবে।"
  })
}

/** Customer or partner asks the office to cancel. */
export async function requestCancelAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(["CUSTOMER", "WORKER"])
    await createRequest({ ...user, role: user.role as Role }, code(form), "CANCEL", 0, String(form.get("note") ?? ""))
    revalidatePath("/", "layout")
    return "বাতিলের অনুরোধ অফিসে গেছে; অফিস দেখে জানাবে।"
  })
}

export async function decideRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(["ADMIN", "OWNER"])
    const decision = String(form.get("decision")) === "APPROVE" ? "APPROVE" : "REJECT"
    await decideRequest({ ...user, role: user.role as Role }, String(form.get("id") ?? ""), decision, String(form.get("note") ?? ""))
    revalidatePath("/", "layout")
    return decision === "APPROVE" ? "অনুমোদন দেওয়া হয়েছে।" : "নাকচ করা হয়েছে।"
  })
}

export async function addHelperAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(["WORKER"])
    await addHelper({ ...user, role: user.role as Role }, { name: String(form.get("name") ?? ""), phone: String(form.get("phone") ?? ""), password: String(form.get("password") ?? "") })
    revalidatePath("/", "layout")
    return "হেল্পার যোগ হয়েছে; HANDYO অফিস অনুমোদন দিলে লগইন করতে পারবে।"
  })
}

export async function reviewHelperAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(["WORKER", "ADMIN", "OWNER"])
    const d = String(form.get("decision"))
    const decision = d === "APPROVE" ? "APPROVE" : d === "REMOVE" ? "REMOVE" : "REJECT"
    await reviewHelper({ ...user, role: user.role as Role }, String(form.get("id") ?? ""), decision)
    revalidatePath("/", "layout")
    return decision === "APPROVE" ? "হেল্পার অনুমোদিত।" : decision === "REMOVE" ? "হেল্পার সরানো হয়েছে।" : "হেল্পার নাকচ।"
  })
}

export async function setOfficeListAction(form: FormData) {
  const user = await actor(["ADMIN", "OWNER"])
  await setOfficeList({ ...user, role: user.role as Role }, String(form.get("workerId") ?? ""), String(form.get("on")) === "1")
  revalidatePath("/", "layout")
}
