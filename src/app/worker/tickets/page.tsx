import { Pause, Play, Ticket } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { taka } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { agentStocks, STOCK_STATUS_TEXT, ticketOfferings } from "@/lib/tickets"
import { addStockAction, toggleStockAction, updateStockQtyAction } from "@/actions/tickets"
import { EmptyState, PageHeader, Section } from "@/components/bits"
import { ActionForm, SubmitButton } from "@/components/forms"

const TONE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-ok/10 text-emerald-800",
  PAUSED: "bg-canvas text-muted-foreground",
  REJECTED: "bg-[var(--danger-soft)] text-danger",
}

/** A ticket agent's stock: how many of each type they hold, what is sold, stock-out switch. */
export default async function TicketsPage() {
  const [user, locale] = await Promise.all([requireUser(["WORKER"], "/worker/tickets"), getLocale()])
  const bn = locale === "bn"
  const partner = user.worker?.kind === "PARTNER"
  if (!partner || !user.worker) {
    return <div className="mx-auto max-w-2xl"><PageHeader title={pick(locale, "টিকিট স্টক", "Ticket stock")} /><EmptyState title={pick(locale, "শুধু পার্টনার এজেন্টের জন্য", "Partner agents only")} /></div>
  }
  const shopId = (await db.workerProfile.findUnique({ where: { id: user.worker.id }, select: { shopId: true } }))?.shopId ?? ""
  const [stocks, offerings] = await Promise.all([agentStocks(user.worker.id), ticketOfferings(shopId)])
  const have = new Set(stocks.filter((s) => s.status !== "REJECTED").map((s) => s.offeringId))
  const open = offerings.filter((o) => !have.has(o.id))
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={pick(locale, "টিকিট স্টক", "Ticket stock")} sub={pick(locale, "আপনার কাছে কত টিকিট আছে লিখুন; বিক্রি হলে কমবে, শূন্য হলে সাইটে “স্টক আউট” দেখাবে।", "Enter how many tickets you hold; sales count down, and zero shows “stock out” on the site.")} />
      <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{pick(locale, "কাস্টমার যে টিকিট কাটে, সেই অর্ডার সরাসরি আপনার ড্যাশবোর্ডে আসে। নতুন স্টক HANDYO অফিস একবার অনুমোদন দিলেই সাইটে উঠবে; এরপর সংখ্যা বদলাতে অনুমোদন লাগে না।", "Every ticket a customer books lands straight on your dashboard. New stock goes live once the HANDYO office approves it; changing the number later needs no approval.")}</p>

      <Section title={pick(locale, "আপনার স্টক", "Your stock")}>
        {!stocks.length ? <p className="py-3 text-sm text-muted-foreground">{pick(locale, "এখনো কিছু নেই। নিচে যোগ করুন।", "Nothing yet. Add below.")}</p> : (
          <ul className="divide-y divide-line">
            {stocks.map((s) => {
              const left = Math.max(0, s.qty - s.sold)
              const status = STOCK_STATUS_TEXT[s.status]
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Ticket className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-ink">{named(locale, s.offering)}</p>
                    <p className="text-xs text-muted-foreground">{taka(s.offering.price, locale)}{pick(locale, "/জন", "/person")} · {pick(locale, `বিক্রি ${s.sold} · বাকি ${left}`, `sold ${s.sold} · left ${left}`)}</p>
                    {s.status === "REJECTED" && s.rejectNote ? <p className="text-xs text-danger">{s.rejectNote}</p> : null}
                  </div>
                  <span className={`pill ${left === 0 && s.status === "APPROVED" ? "bg-rose-100 text-rose-700" : TONE[s.status] ?? "bg-canvas"}`}>{left === 0 && s.status === "APPROVED" ? pick(locale, "স্টক আউট", "Stock out") : status ? (bn ? status.bn : status.en) : s.status}</span>
                  <ActionForm action={updateStockQtyAction} resetOnSuccess={false} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={s.id} />
                    <input name="qty" type="number" min={s.sold} max={5000} defaultValue={s.qty} className="field h-9 w-24 px-2 text-sm" aria-label={pick(locale, "মোট টিকিট", "Total tickets")} />
                    <SubmitButton className="btn-soft h-9 px-3 text-xs">{pick(locale, "আপডেট", "Update")}</SubmitButton>
                  </ActionForm>
                  {s.status === "APPROVED" || s.status === "PAUSED" ? (
                    <form action={toggleStockAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn-ghost h-9 px-3 text-xs">{s.status === "APPROVED" ? <><Pause className="size-3.5" /> {pick(locale, "স্টক আউট করুন", "Mark stock out")}</> : <><Play className="size-3.5" /> {pick(locale, "আবার চালু", "Resume")}</>}</button>
                    </form>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {open.length ? (
        <Section title={pick(locale, "নতুন টিকিটের ধরন যোগ করুন", "Add a ticket type")}>
          <ActionForm action={addStockAction} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label" htmlFor="offeringId">{pick(locale, "টিকিটের ধরন", "Ticket type")}</label>
              <select id="offeringId" name="offeringId" className="field" required>
                {open.map((o) => <option key={o.id} value={o.id}>{named(locale, o)} · {taka(o.price, locale)}</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor="qty">{pick(locale, "কতগুলো টিকিট আছে", "How many you hold")}</label><input id="qty" name="qty" type="number" min={1} max={5000} className="field" required /></div>
            <div><label className="label" htmlFor="note">{pick(locale, "নোট (তারিখ, ঘাট, শর্ত)", "Note (date, jetty, terms)")}</label><input id="note" name="note" className="field" maxLength={300} placeholder={pick(locale, "যেমন: ১–১৫ ডিসেম্বর, নুনিয়ারছড়া ঘাট", "e.g. 1–15 Dec, Nuniarchhara jetty")} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="photos">{pick(locale, "টিকিট / অনুমতিপত্রের ছবি (ঐচ্ছিক, ২টা)", "Photo of the tickets / permit (optional, 2)")}</label><input id="photos" name="photos" type="file" accept="image/*" multiple className="text-xs" /></div>
            <SubmitButton className="btn-primary sm:col-span-2">{pick(locale, "স্টক জমা দিন (অফিস অনুমোদন দেবে)", "Submit stock (office approves)")}</SubmitButton>
          </ActionForm>
        </Section>
      ) : null}
    </div>
  )
}
