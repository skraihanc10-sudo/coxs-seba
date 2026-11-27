import Link from "next/link"
import { TicketCheck } from "lucide-react"
import type { BookingFull } from "@/lib/bookings"
import { BOOKING_DAYS, SLOTS, flowOf } from "@/lib/bookings"
import { isOpen, nextStatuses, statusText, stepsFor, workerButton } from "@/lib/booking-flow"
import { formatDay, taka, upcomingDays, type Locale } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { billFor } from "@/lib/pricing"
import { PAYMENT_PROVIDERS } from "@/lib/payments"
import { assignWorkerAction, forceStatusAction, moveBookingAction, recordPaymentAction, refundNoteAction, rescheduleAction, sendQuoteAction, setPriceAction } from "@/actions/booking"
import { adjustBillAction, decideRequestAction } from "@/actions/partners"
import { sendBookingMessageAction } from "@/actions/support"
import { ActionForm, SubmitButton } from "@/components/forms"
import { Composer, MessageList, type ChatMessage } from "@/components/chat-pane"
import { Avatar, Section } from "@/components/bits"
import { Timeline } from "./timeline"
import { BookingFacts } from "./details"
import { photoUrl } from "@/lib/vehicles"

type WorkerOption = { id: string; name: string; rating: number; busy: number; skilled: boolean; inArea: boolean }

/** The office view of one booking: assign, move, price, pay, chat. Shared by support and admin. */
export function OfficeBooking({
  booking: b,
  locale,
  me,
  isAdmin,
  requests = [],
  workers,
  messages,
  templates,
}: {
  booking: BookingFull
  locale: Locale
  me: string
  isAdmin: boolean
  requests?: Array<{ id: string; kind: string; amount: number; note: string; status: string; by: string; role: string }>
  workers: WorkerOption[]
  messages: ChatMessage[]
  templates: Array<{ id: string; title: string; body: string }>
}) {
  const flow = flowOf(b)
  const open = isOpen(b.status)
  const moves = nextStatuses(flow, b.status).filter((s) => s !== "ASSIGNED")
  const assignable = ["REQUESTED", "CONFIRMED", "ASSIGNED", "ACCEPTED"].includes(b.status)
  const eligible = workers.filter((w) => w.skilled).sort((a, c) => Number(c.inArea) - Number(a.inArea) || a.busy - c.busy || c.rating - a.rating)
  const vehicle = b.vehicle
  const property = b.property
  const store = b.store
  const ownerId = vehicle?.workerId ?? property?.workerId ?? store?.workerId ?? null
  const owner = ownerId ? workers.find((w) => w.id === ownerId) : undefined
  const sendToOwner = Boolean(ownerId && owner && ["REQUESTED", "CONFIRMED"].includes(b.status) && b.workerId !== ownerId)
  const vehiclePhoto = vehicle ? vehicle.photos.split(",").map((p) => p.trim()).filter(Boolean)[0] : undefined

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
      <div className="space-y-4">
        <div className="card flex items-center gap-3 p-4">
          <Avatar name={b.contactName || b.customer.name} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold text-ink">{b.contactName || b.customer.name}</p>
            <p className="text-xs text-muted-foreground">{b.phone} · {named(locale, b.area)} · {formatDay(b.visitDate, locale)} {b.visitSlot}</p>
            <p className="mt-0.5 text-[11px] font-bold text-brand">{pick(locale, "শপ:", "Shop:")} {named(locale, b.shop)}</p>
          </div>
          {isAdmin ? <Link href={`/admin/customers/${b.customerId}`} className="text-xs font-bold text-brand">{pick(locale, "প্রোফাইল", "Profile")}</Link> : null}
        </div>

        {store ? (
          <Section title={pick(locale, "দোকান (পার্সেল)", "Store (parcel)")}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-extrabold text-ink">{locale === "bn" ? store.nameBn || store.name : store.name || store.nameBn}</p>
                <p className="text-xs text-muted-foreground">{b.items.length} {pick(locale, "ধরনের পণ্য", "item types")} · {owner ? `${pick(locale, "মালিক:", "Owner:")} ${owner.name}` : pick(locale, "HANDYO-র নিজের দোকান", "HANDYO's own store")}</p>
              </div>
              {isAdmin ? <Link href={`/admin/stores/${store.id}`} className="text-xs font-bold text-brand">{pick(locale, "দোকান", "Store")} →</Link> : null}
            </div>
            {sendToOwner && ownerId ? (
              <ActionForm action={assignWorkerAction} resetOnSuccess={false} className="mt-3">
                <input type="hidden" name="code" value={b.code} />
                <input type="hidden" name="workerId" value={ownerId} />
                <SubmitButton className="btn-primary h-10 w-full text-sm">{pick(locale, "দোকানের মালিকের কাছে পাঠান", "Send to the store owner")}</SubmitButton>
              </ActionForm>
            ) : null}
          </Section>
        ) : null}
        {property ? (
          <Section title={pick(locale, "রিসোর্ট / হোটেল", "Resort / hotel")}>
            <div className="flex items-center gap-3">
              {property.photos.split(",")[0]?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl(property.photos.split(",")[0].trim())} alt="" className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-line" />
              ) : null}
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-extrabold text-ink">{locale === "bn" ? property.nameBn || property.name : property.name || property.nameBn}</p>
                <p className="text-xs text-muted-foreground">{b.roomType ? `${b.roomType.name} × ${b.rooms} · ` : ""}{b.nights} {pick(locale, "রাত", "nights")} · {b.guests} {pick(locale, "জন", "guests")} · {formatDay(b.visitDate, locale)} → {b.checkOut ? formatDay(b.checkOut, locale) : "—"}</p>
                <p className="text-xs text-muted-foreground">{owner ? `${pick(locale, "মালিক:", "Owner:")} ${owner.name}` : pick(locale, "HANDYO পরিচালিত", "HANDYO-managed")}</p>
              </div>
              {isAdmin ? <Link href={`/admin/stays/${property.id}`} className="text-xs font-bold text-brand">{pick(locale, "রিসোর্ট", "Property")} →</Link> : null}
            </div>
            {sendToOwner && ownerId ? (
              <ActionForm action={assignWorkerAction} resetOnSuccess={false} className="mt-3">
                <input type="hidden" name="code" value={b.code} />
                <input type="hidden" name="workerId" value={ownerId} />
                <SubmitButton className="btn-primary h-10 w-full text-sm">{pick(locale, "রিসোর্ট মালিকের কাছে পাঠান", "Send to the resort owner")}</SubmitButton>
              </ActionForm>
            ) : null}
          </Section>
        ) : null}
        {vehicle ? (
          <Section title={pick(locale, "গাড়ি", "Vehicle")}>
            <div className="flex items-center gap-3">
              {vehiclePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl(vehiclePhoto)} alt="" className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-line" />
              ) : null}
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-extrabold text-ink">{locale === "bn" ? vehicle.titleBn || vehicle.title : vehicle.title || vehicle.titleBn}</p>
                {b.routeName ? <p className="text-xs font-bold text-brand">{pick(locale, "রুট:", "Route:")} {b.routeName}</p> : null}
                <p className="text-xs text-muted-foreground">{vehicle.plate ? `${vehicle.plate} · ` : ""}{vehicle.seats} {pick(locale, "সিট", "seats")}{owner ? ` · ${pick(locale, "মালিক:", "Owner:")} ${owner.name}` : ` · ${pick(locale, "HANDYO-র নিজের", "HANDYO's own")}`}</p>
              </div>
              {isAdmin ? <Link href={`/admin/vehicles/${vehicle.id}`} className="text-xs font-bold text-brand">{pick(locale, "গাড়ি", "Vehicle")} →</Link> : null}
            </div>
            {sendToOwner && ownerId ? (
              <ActionForm action={assignWorkerAction} resetOnSuccess={false} className="mt-3">
                <input type="hidden" name="code" value={b.code} />
                <input type="hidden" name="workerId" value={ownerId} />
                <SubmitButton className="btn-primary h-10 w-full text-sm">{pick(locale, "গাড়ির মালিকের কাছে পাঠান", "Send to the vehicle owner")}</SubmitButton>
              </ActionForm>
            ) : null}
          </Section>
        ) : null}

        {assignable ? (
          <Section title={b.worker ? pick(locale, "কর্মী বদলান", "Reassign worker") : pick(locale, "কর্মী ঠিক করুন", "Assign a worker")}>
            {b.worker ? <p className="mb-2 text-sm text-muted-foreground">{pick(locale, "এখন:", "Now:")} <span className="font-bold text-ink">{b.worker.user.name}</span></p> : null}
            {!eligible.length ? <p className="text-sm text-danger">{pick(locale, "এই সেবার দক্ষতাসহ কোনো সক্রিয় কর্মী নেই। Workers পেজে দক্ষতা যোগ করুন।", "No active worker has this skill. Add it on the Workers page.")}</p> : (
              <ActionForm action={assignWorkerAction} resetOnSuccess={false} className="flex gap-2">
                <input type="hidden" name="code" value={b.code} />
                <select name="workerId" className="field flex-1" defaultValue={b.workerId ?? (ownerId && eligible.some((w) => w.id === ownerId) ? ownerId : eligible[0]?.id)}>
                  {eligible.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} · ★{w.rating ? w.rating.toFixed(1) : pick(locale, "নতুন", "new")} · {w.busy} {pick(locale, "চলমান", "active")}{w.inArea ? ` · ${pick(locale, "এই এলাকায়", "in area")}` : ""}
                    </option>
                  ))}
                </select>
                <SubmitButton className="btn-primary shrink-0 px-4">{pick(locale, "ঠিক করুন", "Assign")}</SubmitButton>
              </ActionForm>
            )}
          </Section>
        ) : null}

        {open && moves.length ? (
          <Section title={pick(locale, "ধাপ বদলান", "Move status")}>
            <div className="flex flex-wrap gap-2">
              {moves.filter((s) => s !== "CANCELLED").map((s) => (
                <ActionForm key={s} action={moveBookingAction} resetOnSuccess={false} className="inline">
                  <input type="hidden" name="code" value={b.code} />
                  <input type="hidden" name="to" value={s} />
                  <SubmitButton className="btn-soft h-10 px-4 text-sm">{workerButton(flow, s, locale)}</SubmitButton>
                </ActionForm>
              ))}
            </div>
            {moves.includes("CANCELLED") ? (
              <ActionForm action={moveBookingAction} resetOnSuccess={false} className="mt-3 flex gap-2">
                <input type="hidden" name="code" value={b.code} />
                <input type="hidden" name="to" value="CANCELLED" />
                <input name="note" className="field flex-1" placeholder={pick(locale, "বাতিলের কারণ", "Cancel reason")} required minLength={3} />
                <SubmitButton className="btn-danger shrink-0 px-4">{pick(locale, "বাতিল", "Cancel")}</SubmitButton>
              </ActionForm>
            ) : null}
          </Section>
        ) : null}

        {b.pricing === "QUOTE" && b.quoteStatus !== "ACCEPTED" && open ? (
          <Section title={pick(locale, "দাম পাঠান", "Send quote")}>
            {b.quoteStatus === "SENT" ? <p className="mb-2 text-sm text-muted-foreground">{taka(b.quoteAmount ?? 0, locale)} {pick(locale, "পাঠানো আছে, কাস্টমারের অপেক্ষায়।", "sent, waiting on the customer.")}</p> : null}
            <ActionForm action={sendQuoteAction} className="flex gap-2">
              <input type="hidden" name="code" value={b.code} />
              <input name="amount" type="number" min={50} max={500000} required className="field w-32" placeholder="৳" />
              <input name="note" className="field flex-1" placeholder={pick(locale, "নোট", "Note")} maxLength={300} />
              <SubmitButton className="btn-soft shrink-0 px-4">{pick(locale, "পাঠান", "Send")}</SubmitButton>
            </ActionForm>
          </Section>
        ) : null}

        {open && ["REQUESTED", "CONFIRMED", "ASSIGNED", "ACCEPTED"].includes(b.status) ? (
          <Section title={pick(locale, "সময় বদলান", "Reschedule")}>
            <ActionForm action={rescheduleAction} resetOnSuccess={false} className="flex flex-wrap gap-2">
              <input type="hidden" name="code" value={b.code} />
              <select name="visitDate" defaultValue={b.visitDate} className="field flex-1">{upcomingDays(BOOKING_DAYS).map((d) => <option key={d} value={d}>{formatDay(d, locale)}</option>)}</select>
              <select name="visitSlot" defaultValue={b.visitSlot} className="field flex-1">{SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <SubmitButton className="btn-soft shrink-0 px-4">{pick(locale, "সেভ", "Save")}</SubmitButton>
            </ActionForm>
          </Section>
        ) : null}

        {requests.filter((r) => r.status === "PENDING").length ? (
          <Section title={pick(locale, "অনুমোদনের অপেক্ষায়", "Waiting for your approval")}>
            <ul className="space-y-3">
              {requests.filter((r) => r.status === "PENDING").map((r) => (
                <li key={r.id} className="rounded-xl bg-amber-50 p-3 text-sm">
                  <p className="font-extrabold text-amber-900">{r.kind === "EXTRA" ? pick(locale, `এক্সট্রা চার্জ +${taka(r.amount, locale)}`, `Extra charge +${taka(r.amount, locale)}`) : pick(locale, "বাতিলের অনুরোধ", "Cancellation request")} <span className="font-normal text-amber-800">· {r.by} ({r.role === "CUSTOMER" ? pick(locale, "কাস্টমার", "customer") : pick(locale, "পার্টনার", "partner")})</span></p>
                  <p className="mt-1 text-amber-900">“{r.note}”</p>
                  {isAdmin ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ActionForm action={decideRequestAction} resetOnSuccess={false} className="inline"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="APPROVE" /><SubmitButton className="btn-primary h-9 px-3 text-xs">{r.kind === "CANCEL" ? pick(locale, "বাতিল অনুমোদন", "Approve cancel") : pick(locale, "বিলে যোগ", "Add to bill")}</SubmitButton></ActionForm>
                      <ActionForm action={decideRequestAction} resetOnSuccess={false} className="flex flex-1 gap-2"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="REJECT" /><input name="note" className="field h-9 flex-1 text-xs" placeholder={pick(locale, "নাকচের কারণ", "Reason")} required minLength={2} /><SubmitButton className="btn-soft h-9 shrink-0 px-3 text-xs">{pick(locale, "নাকচ", "Reject")}</SubmitButton></ActionForm>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {isAdmin ? (
            <Section title={pick(locale, "বিল কম / বেশি করুন", "Adjust the bill")}>
              <ActionForm action={adjustBillAction} resetOnSuccess={false} className="space-y-2">
                <input type="hidden" name="code" value={b.code} />
                <input name="extraCharge" type="number" step={1} min={-500000} max={500000} defaultValue={b.extraCharge} className="field" placeholder={pick(locale, "+ যোগ / − কম (৳)", "+ add / − reduce (৳)")} />
                <input name="note" className="field" defaultValue={b.extraNote} placeholder={pick(locale, "কীসের জন্য (যেমন: পার্টস, বাড়তি দূরত্ব)", "What for (e.g. parts, extra distance)")} maxLength={200} />
                <SubmitButton className="btn-soft w-full">{pick(locale, "বিল আপডেট", "Update bill")}</SubmitButton>
                <p className="text-xs text-muted-foreground">{pick(locale, `এখন বিল ${taka(b.finalPrice ?? billFor(b), locale)}। ঋণাত্মক লিখলে বিল কমবে।`, `Bill now ${taka(b.finalPrice ?? billFor(b), locale)}. Negative reduces it.`)}</p>
              </ActionForm>
            </Section>
          ) : null}
          {isAdmin ? (
            <Section title={pick(locale, "চূড়ান্ত দাম লিখে দিন", "Override final price")}>
              <ActionForm action={setPriceAction} resetOnSuccess={false} className="space-y-2">
                <input type="hidden" name="code" value={b.code} />
                <input name="finalPrice" type="number" min={0} defaultValue={b.finalPrice ?? billFor(b)} className="field" />
                <input name="note" className="field" placeholder={pick(locale, "কেন বদলালেন", "Why it changed")} maxLength={200} />
                <SubmitButton className="btn-soft w-full">{pick(locale, "দাম সেভ", "Save price")}</SubmitButton>
              </ActionForm>
            </Section>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Section title={pick(locale, "বাতিল / রিফান্ড নোট", "Cancel / refund note")}>
            <ActionForm action={refundNoteAction} resetOnSuccess={false} className="space-y-2">
              <input type="hidden" name="code" value={b.code} />
              <textarea name="note" className="field min-h-20" defaultValue={b.refundNote} placeholder={pick(locale, "যেমন: ৫০০ টাকা বিকাশে ফেরত, TrxID…", "e.g. ৳500 refunded by bKash, TrxID…")} maxLength={500} />
              <SubmitButton className="btn-soft w-full">{pick(locale, "নোট সেভ", "Save note")}</SubmitButton>
            </ActionForm>
          </Section>
        </div>

        {b.status === "COMPLETED" && b.paymentStatus !== "PAID" ? (
          <Section title={pick(locale, `পেমেন্ট লিখুন: ${taka(b.finalPrice ?? billFor(b), locale)}`, `Record payment: ${taka(b.finalPrice ?? billFor(b), locale)}`)}>
            <ActionForm action={recordPaymentAction} resetOnSuccess={false} className="flex flex-wrap gap-2">
              <input type="hidden" name="code" value={b.code} />
              <select name="method" defaultValue={b.paymentMethod} className="field w-36">{PAYMENT_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{locale === "bn" ? p.labelBn : p.label}</option>)}</select>
              <input name="reference" className="field flex-1" placeholder="TrxID" maxLength={40} />
              <SubmitButton className="btn-soft shrink-0 px-4">{pick(locale, "পরিশোধিত", "Paid")}</SubmitButton>
            </ActionForm>
          </Section>
        ) : null}

        <Section title={pick(locale, "চ্যাট", "Chat")} action={<Link href={`/support/tickets?booking=${b.code}`} className="inline-flex items-center gap-1 text-xs font-bold text-brand"><TicketCheck className="size-3.5" /> {pick(locale, "টিকেট", "Tickets")}</Link>}>
          <MessageList messages={messages} me={me} locale={locale} empty={pick(locale, "এখনো কোনো মেসেজ নেই।", "No messages yet.")} />
          <Composer action={sendBookingMessageAction} fields={{ code: b.code }} placeholder={pick(locale, "কাস্টমার ও কর্মীকে লিখুন…", "Write to the customer and worker…")} templates={templates} sticky={false} />
        </Section>
      </div>

      <div className="space-y-4">
        <Section title={pick(locale, "অবস্থা", "Status")}>
          <Timeline flow={flow} status={b.status} events={b.events} locale={locale} />
          {isAdmin ? (
            <details className="mt-3 rounded-xl bg-canvas p-3">
              <summary className="cursor-pointer text-sm font-bold text-ink">{pick(locale, "ধাপ জোর করে বদলান (অ্যাডমিন)", "Force a step (admin)")}</summary>
              <p className="mt-1 text-xs text-muted-foreground">{pick(locale, "যেকোনো ধাপে নিয়ে যান, যেমন কর্মী ফোনে জানালে বা ভুল চাপ পড়লে। ইতিহাসে লেখা থাকবে।", "Jump to any step, e.g. when a worker phones in or a wrong tap must be undone. It is logged in the history.")}</p>
              <ActionForm action={forceStatusAction} resetOnSuccess={false} className="mt-2 flex flex-wrap gap-2">
                <input type="hidden" name="code" value={b.code} />
                <select name="to" className="field flex-1" defaultValue="">
                  <option value="" disabled>{pick(locale, "ধাপ বেছে নিন", "Choose a step")}</option>
                  {[...stepsFor(flow), "CANCELLED"].filter((s) => s !== b.status).map((s) => <option key={s} value={s}>{statusText(s, locale)}</option>)}
                </select>
                <input name="note" className="field flex-1" placeholder={pick(locale, "কারণ (বাতিলে বাধ্যতামূলক)", "Reason (required for cancel)")} maxLength={300} />
                <SubmitButton className="btn-soft shrink-0 px-4">{pick(locale, "সেট", "Set")}</SubmitButton>
              </ActionForm>
            </details>
          ) : null}
          {b.cancelReason ? <p className="mt-3 text-sm text-danger">{pick(locale, "বাতিলের কারণ:", "Cancel reason:")} {b.cancelReason}</p> : null}
          {b.adminNote ? <p className="mt-2 text-sm text-muted-foreground">{pick(locale, "অ্যাডমিন নোট:", "Admin note:")} {b.adminNote}</p> : null}
        </Section>
        <Section title={pick(locale, "বিস্তারিত", "Details")}>
          <BookingFacts booking={b} locale={locale} showCustomer />
        </Section>
        {b.review ? (
          <Section title={pick(locale, "রিভিউ", "Review")}>
            <p className="text-amber-400">{"★".repeat(b.review.rating)}</p>
            <p className="mt-1 text-sm">{b.review.comment}</p>
          </Section>
        ) : null}
      </div>
    </div>
  )
}
