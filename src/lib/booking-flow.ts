/**
 * The booking state machine. Every status change goes through `canMove`,
 * so a booking can never skip a step or go backwards.
 *
 * Standard visit:  REQUESTED → CONFIRMED → ASSIGNED → ACCEPTED → ON_THE_WAY → ARRIVED → IN_PROGRESS → COMPLETED
 * Laundry:         REQUESTED → CONFIRMED → ASSIGNED → ACCEPTED → PICKED_UP → AT_LAUNDRY → READY → OUT_FOR_DELIVERY → COMPLETED
 * Inspection jobs (pricing QUOTE) also need an accepted quote before IN_PROGRESS.
 * CONFIRMED is optional: the admin can assign a worker straight from REQUESTED.
 */
import type { Role } from "./roles"

export type Flow = "VISIT" | "LAUNDRY" | "STAY" | "SHOP"

export const VISIT_STEPS = ["REQUESTED", "CONFIRMED", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"] as const
export const LAUNDRY_STEPS = ["REQUESTED", "CONFIRMED", "ASSIGNED", "ACCEPTED", "PICKED_UP", "AT_LAUNDRY", "READY", "OUT_FOR_DELIVERY", "COMPLETED"] as const

/** Stays: the resort confirms, the guest checks in, then checks out. */
export const STAY_STEPS = ["REQUESTED", "CONFIRMED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"] as const

/** Shop orders: confirm, pack, hand to the courier, delivered. */
export const SHOP_STEPS = ["REQUESTED", "CONFIRMED", "IN_PROGRESS", "OUT_FOR_DELIVERY", "COMPLETED"] as const

export const TERMINAL = ["COMPLETED", "CANCELLED"]

const SHOP_NEXT: Record<string, string[]> = {
  REQUESTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
}

const STAY_NEXT: Record<string, string[]> = {
  REQUESTED: ["CONFIRMED", "ASSIGNED", "CANCELLED"],
  CONFIRMED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
}

const VISIT_NEXT: Record<string, string[]> = {
  REQUESTED: ["CONFIRMED", "ASSIGNED", "CANCELLED"],
  CONFIRMED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ON_THE_WAY", "CANCELLED"],
  ON_THE_WAY: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
}

const LAUNDRY_NEXT: Record<string, string[]> = {
  REQUESTED: ["CONFIRMED", "ASSIGNED", "CANCELLED"],
  CONFIRMED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["AT_LAUNDRY"],
  AT_LAUNDRY: ["READY"],
  READY: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
}

/** Steps a worker presses on their phone, in order. */
const WORKER_MOVES = ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "PICKED_UP", "AT_LAUNDRY", "READY", "OUT_FOR_DELIVERY", "COMPLETED"]
/** The office can also move these (for example when a worker calls in). */
const OFFICE_MOVES = ["CONFIRMED", "ASSIGNED", "CANCELLED", ...WORKER_MOVES]

export function flowFor(categoryFlow: string): Flow {
  return categoryFlow === "LAUNDRY" ? "LAUNDRY" : categoryFlow === "STAY" ? "STAY" : categoryFlow === "SHOP" ? "SHOP" : "VISIT"
}

export function stepsFor(flow: Flow): readonly string[] {
  return flow === "LAUNDRY" ? LAUNDRY_STEPS : flow === "STAY" ? STAY_STEPS : flow === "SHOP" ? SHOP_STEPS : VISIT_STEPS
}

export function nextStatuses(flow: Flow, status: string) {
  return (flow === "LAUNDRY" ? LAUNDRY_NEXT : flow === "STAY" ? STAY_NEXT : flow === "SHOP" ? SHOP_NEXT : VISIT_NEXT)[status] ?? []
}

export function canMove(flow: Flow, from: string, to: string) {
  return nextStatuses(flow, from).includes(to)
}

export function roleMayMove(role: Role, to: string) {
  if (role === "WORKER") return WORKER_MOVES.includes(to)
  if (role === "ADMIN" || role === "SUPPORT" || role === "OWNER") return OFFICE_MOVES.includes(to)
  if (role === "CUSTOMER") return to === "CANCELLED"
  return false
}

/** The single forward step a worker should see as the big button. */
export function workerNext(flow: Flow, status: string) {
  return nextStatuses(flow, status).find((s) => WORKER_MOVES.includes(s)) ?? null
}

/** Customers may cancel or reschedule only before anyone is on the way. */
export function customerCanChange(status: string) {
  return ["REQUESTED", "CONFIRMED", "ASSIGNED", "ACCEPTED"].includes(status)
}

export function isOpen(status: string) {
  return !TERMINAL.includes(status)
}

export const STATUS_TEXT: Record<string, { bn: string; en: string }> = {
  REQUESTED: { bn: "বুকিং হয়েছে", en: "Booked" },
  CONFIRMED: { bn: "নিশ্চিত হয়েছে", en: "Confirmed" },
  ASSIGNED: { bn: "কর্মী ঠিক হয়েছে", en: "Worker assigned" },
  ACCEPTED: { bn: "কর্মী গ্রহণ করেছেন", en: "Worker accepted" },
  ON_THE_WAY: { bn: "কর্মী রওনা দিয়েছেন", en: "Worker on the way" },
  ARRIVED: { bn: "কর্মী পৌঁছেছেন", en: "Worker arrived" },
  IN_PROGRESS: { bn: "কাজ চলছে", en: "Work in progress" },
  PICKED_UP: { bn: "কাপড় নেওয়া হয়েছে", en: "Picked up" },
  AT_LAUNDRY: { bn: "লন্ড্রিতে জমা", en: "At the laundry" },
  READY: { bn: "কাপড় রেডি", en: "Ready" },
  OUT_FOR_DELIVERY: { bn: "ডেলিভারিতে বেরিয়েছে", en: "Out for delivery" },
  COMPLETED: { bn: "সম্পন্ন", en: "Completed" },
  CANCELLED: { bn: "বাতিল", en: "Cancelled" },
}

/** What the worker's big button says for each forward step. */
export const WORKER_BUTTON: Record<string, { bn: string; en: string }> = {
  ACCEPTED: { bn: "জব গ্রহণ করুন", en: "Accept job" },
  ON_THE_WAY: { bn: "রওনা দিয়েছি", en: "I'm on the way" },
  ARRIVED: { bn: "পৌঁছেছি", en: "I've arrived" },
  IN_PROGRESS: { bn: "কাজ শুরু", en: "Start work" },
  COMPLETED: { bn: "কাজ শেষ", en: "Job done" },
  PICKED_UP: { bn: "কাপড় নিয়েছি", en: "Picked up" },
  AT_LAUNDRY: { bn: "লন্ড্রিতে জমা দিয়েছি", en: "Dropped at laundry" },
  READY: { bn: "কাপড় রেডি", en: "Clothes ready" },
  OUT_FOR_DELIVERY: { bn: "ডেলিভারিতে যাচ্ছি", en: "Out for delivery" },
}

/** Stays read differently: the "worker" is the resort and the job is the stay itself. */
const STAY_STATUS_TEXT: Record<string, { bn: string; en: string }> = {
  ASSIGNED: { bn: "রিসোর্টে পাঠানো হয়েছে", en: "Sent to the resort" },
  ACCEPTED: { bn: "রিসোর্ট নিশ্চিত করেছে", en: "Resort confirmed" },
  IN_PROGRESS: { bn: "চেক-ইন হয়েছে", en: "Checked in" },
  COMPLETED: { bn: "চেক-আউট সম্পন্ন", en: "Checked out" },
}

const STAY_BUTTON: Record<string, { bn: string; en: string }> = {
  ACCEPTED: { bn: "বুকিং গ্রহণ করুন", en: "Accept booking" },
  IN_PROGRESS: { bn: "গেস্ট চেক-ইন করেছে", en: "Guest checked in" },
  COMPLETED: { bn: "চেক-আউট হয়েছে", en: "Checked out" },
}

const SHOP_STATUS_TEXT: Record<string, { bn: string; en: string }> = {
  REQUESTED: { bn: "অর্ডার হয়েছে", en: "Ordered" },
  CONFIRMED: { bn: "অর্ডার কনফার্ম", en: "Order confirmed" },
  IN_PROGRESS: { bn: "প্যাক হচ্ছে", en: "Being packed" },
  OUT_FOR_DELIVERY: { bn: "কুরিয়ারে পাঠানো হয়েছে", en: "Shipped" },
  COMPLETED: { bn: "ডেলিভারি হয়েছে", en: "Delivered" },
}

const SHOP_BUTTON: Record<string, { bn: string; en: string }> = {
  CONFIRMED: { bn: "অর্ডার কনফার্ম করুন", en: "Confirm order" },
  IN_PROGRESS: { bn: "প্যাকিং শুরু", en: "Start packing" },
  OUT_FOR_DELIVERY: { bn: "কুরিয়ারে পাঠানো হয়েছে", en: "Handed to courier" },
  COMPLETED: { bn: "ডেলিভারি হয়েছে", en: "Delivered" },
}

export function statusText(status: string, locale: "bn" | "en", flow?: Flow) {
  const row = (flow === "STAY" ? STAY_STATUS_TEXT[status] : flow === "SHOP" ? SHOP_STATUS_TEXT[status] : undefined) ?? STATUS_TEXT[status]
  return row ? row[locale] : status
}

/** The label of the forward-step button for a flow. */
export function workerButton(flow: Flow, status: string, locale: "bn" | "en") {
  const row = (flow === "STAY" ? STAY_BUTTON[status] : flow === "SHOP" ? SHOP_BUTTON[status] : undefined) ?? WORKER_BUTTON[status]
  return row ? row[locale] : statusText(status, locale, flow)
}

export function statusTone(status: string) {
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-800"
  if (status === "CANCELLED") return "bg-rose-100 text-rose-700"
  if (status === "REQUESTED" || status === "CONFIRMED") return "bg-amber-100 text-amber-800"
  if (status === "ASSIGNED" || status === "ACCEPTED") return "bg-violet-100 text-violet-800"
  return "bg-sky-100 text-sky-800"
}
