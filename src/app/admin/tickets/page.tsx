import Link from "next/link"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { shopStocks, STOCK_STATUS_TEXT } from "@/lib/tickets"
import { formatWhen, taka } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { reviewStockAction } from "@/actions/tickets"
import { EmptyState, PageHeader, Section } from "@/components/bits"
import { ActionForm, SubmitButton } from "@/components/forms"

const TONE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-canvas text-muted-foreground",
  REJECTED: "bg-rose-100 text-rose-700",
}

/** Every agent's ticket stock for the office: approve new stock, pause one, see what is left. */
export default async function AdminTicketsPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/tickets"), getLocale()])
  const shop = await officeShop(user)
  const stocks = await shopStocks(user.role === "OWNER" ? null : shop.id)
  const bn = locale === "bn"
  const pending = stocks.filter((s) => s.status === "PENDING")
  const rest = stocks.filter((s) => s.status !== "PENDING")
  const totalLeft = stocks.filter((s) => s.status === "APPROVED").reduce((n, s) => n + Math.max(0, s.qty - s.sold), 0)
  const Row = ({ s }: { s: (typeof stocks)[number] }) => {
    const left = Math.max(0, s.qty - s.sold)
    const status = STOCK_STATUS_TEXT[s.status]
    return (
      <li className="card p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-ink">{named(locale, s.offering)} <span className="text-sm font-normal text-muted-foreground">· {taka(s.offering.price, locale)}</span></p>
            <p className="mt-0.5 text-sm text-muted-foreground">{pick(locale, "এজেন্ট:", "Agent:")} <Link href={`/admin/partners/${s.worker.id}`} className="font-bold text-brand">{s.worker.businessName || s.worker.user.name}</Link> · {s.worker.user.phone} · {formatWhen(s.createdAt, locale)}</p>
            <p className="mt-1 text-sm text-ink">{pick(locale, `মোট ${s.qty} · বিক্রি ${s.sold} · বাকি ${left}`, `total ${s.qty} · sold ${s.sold} · left ${left}`)}{s.note ? <span className="text-muted-foreground"> · {s.note}</span> : null}</p>
          </div>
          <span className={`pill ${left === 0 && s.status === "APPROVED" ? "bg-rose-100 text-rose-700" : TONE[s.status]}`}>{left === 0 && s.status === "APPROVED" ? pick(locale, "স্টক আউট", "Stock out") : status ? (bn ? status.bn : status.en) : s.status}</span>
          {s.photos ? <div className="flex gap-1.5">{s.photos.split(",").filter(Boolean).map((f) => (
            // eslint-disable-next-line @next/next/no-img-element
            <a key={f} href={`/api/uploads/${f}`} target="_blank" rel="noopener"><img src={`/api/uploads/${f}`} alt="" className="h-14 w-20 rounded-lg object-cover ring-1 ring-line" /></a>
          ))}</div> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {s.status === "PENDING" ? (
            <>
              <ActionForm action={reviewStockAction} resetOnSuccess={false} className="inline"><input type="hidden" name="id" value={s.id} /><input type="hidden" name="decision" value="APPROVE" /><SubmitButton className="btn-primary h-9 px-3 text-sm">{pick(locale, "অনুমোদন দিন", "Approve")}</SubmitButton></ActionForm>
              <ActionForm action={reviewStockAction} resetOnSuccess={false} className="flex flex-1 gap-2"><input type="hidden" name="id" value={s.id} /><input type="hidden" name="decision" value="REJECT" /><input name="note" className="field h-9 flex-1 text-sm" placeholder={pick(locale, "নাকচের কারণ", "Reason")} /><SubmitButton className="btn-soft h-9 px-3 text-sm">{pick(locale, "নাকচ", "Reject")}</SubmitButton></ActionForm>
            </>
          ) : s.status === "APPROVED" ? (
            <ActionForm action={reviewStockAction} resetOnSuccess={false} className="inline"><input type="hidden" name="id" value={s.id} /><input type="hidden" name="decision" value="PAUSE" /><SubmitButton className="btn-ghost h-9 px-3 text-sm">{pick(locale, "বন্ধ রাখুন", "Pause")}</SubmitButton></ActionForm>
          ) : s.status === "PAUSED" ? (
            <ActionForm action={reviewStockAction} resetOnSuccess={false} className="inline"><input type="hidden" name="id" value={s.id} /><input type="hidden" name="decision" value="RESUME" /><SubmitButton className="btn-soft h-9 px-3 text-sm">{pick(locale, "আবার চালু", "Resume")}</SubmitButton></ActionForm>
          ) : null}
        </div>
      </li>
    )
  }
  return (
    <div className="space-y-6">
      <PageHeader title={pick(locale, "টিকিট স্টক", "Ticket stock")} sub={pick(locale, `${pending.length}টা অনুমোদনের অপেক্ষায় · এখন বিক্রির জন্য ${totalLeft}টা টিকিট`, `${pending.length} waiting · ${totalLeft} tickets on sale right now`)} />
      <Section title={pick(locale, "অনুমোদনের অপেক্ষায়", "Waiting for approval")}>
        {!pending.length ? <p className="py-3 text-sm text-muted-foreground">{pick(locale, "কিছু নেই।", "Nothing waiting.")}</p> : <ul className="space-y-3">{pending.map((s) => <Row key={s.id} s={s} />)}</ul>}
      </Section>
      <Section title={pick(locale, "সব এজেন্টের স্টক", "All agents' stock")}>
        {!rest.length ? <EmptyState title={pick(locale, "এখনো কোনো এজেন্ট স্টক দেয়নি", "No agent stock yet")} body={pick(locale, "এজেন্ট /partner থেকে “সেন্ট মার্টিন শিপ টিকিট” বেছে অ্যাকাউন্ট খুললে, অনুমোদনের পর তাদের প্যানেল থেকে স্টক দেবে।", "Agents sign up at /partner choosing ship tickets; once approved they add stock from their panel.")} /> : <ul className="space-y-3">{rest.map((s) => <Row key={s.id} s={s} />)}</ul>}
      </Section>
    </div>
  )
}
