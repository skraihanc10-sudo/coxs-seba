import Link from "next/link"
import { notFound } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { db } from "@/lib/db"
import { partnerBookingsWhere, partnerHelpers, partnerLedger } from "@/lib/partners"
import { formatDay, taka } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { setOfficeListAction, reviewHelperAction } from "@/actions/partners"
import { PageHeader, Section, StatusPill } from "@/components/bits"
import { ActionForm, SubmitButton } from "@/components/forms"

/** One partner for the office: ledger (হিসাব), every order (listed or not), helpers and the office-list switch. */
export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, locale] = await Promise.all([params, requireUser(ADMINS, "/admin/partners"), getLocale()])
  const shop = await officeShop(user)
  const partner = await db.workerProfile.findFirst({
    where: { id, kind: "PARTNER", ...(user.role === "OWNER" ? {} : { shopId: shop.id }) },
    include: { user: true, stores: { select: { id: true, name: true, nameBn: true, status: true } }, vehicles: { select: { id: true, title: true, titleBn: true, status: true } }, properties: { select: { id: true, name: true, nameBn: true, status: true } } },
  })
  if (!partner) notFound()
  const [ledger, helpers, open] = await Promise.all([
    partnerLedger(partner),
    partnerHelpers(partner.id),
    db.serviceBooking.findMany({ where: { ...partnerBookingsWhere(partner.id), status: { notIn: ["COMPLETED", "CANCELLED"] } }, orderBy: { createdAt: "desc" }, take: 50, include: { offering: true, category: true, customer: { select: { name: true } } } }),
  ])
  const unpaid = ledger.rows.filter((r) => !r.paid)
  return (
    <div className="space-y-6">
      <PageHeader back="/admin/partners" title={partner.user.name} sub={`${partner.user.phone ?? ""} · ${pick(locale, `পার্টনারের ভাগ ${ledger.share}%`, `partner share ${ledger.share}%`)}`} action={
        <form action={setOfficeListAction}>
          <input type="hidden" name="workerId" value={partner.id} />
          <input type="hidden" name="on" value={partner.officeList ? "0" : "1"} />
          <button className={`btn-soft h-10 px-3 text-sm ${partner.officeList ? "" : "opacity-70"}`}>{partner.officeList ? pick(locale, "অফিস তালিকায়: চালু", "List in office: on") : pick(locale, "অফিস তালিকায়: বন্ধ", "List in office: off")}</button>
        </form>
      } />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[[pick(locale, "মোট বিক্রি", "Gross"), ledger.totals.gross], [pick(locale, "পার্টনারের", "Partner's"), ledger.totals.partner], [pick(locale, "HANDYO-র", "HANDYO's"), ledger.totals.handyo], [pick(locale, "বাকি (অপরিশোধিত)", "Unpaid"), unpaid.reduce((n, r) => n + r.gross, 0)]].map(([label, value], i) => (
          <div key={label as string} className="kpi p-4" data-primary={i === 2}>
            <p className={`text-xs font-bold ${i === 2 ? "text-white/70" : "text-muted-foreground"}`}>{label as string}</p>
            <p className="text-xl font-extrabold">{taka(value as number, locale)}</p>
          </div>
        ))}
      </div>

      <Section title={pick(locale, "কী কী লিস্ট করা", "Listings")}>
        <p className="flex flex-wrap gap-1.5 text-xs">
          {partner.stores.map((s) => <Link key={s.id} href={`/admin/stores/${s.id}`} className="pill bg-brand-soft text-brand">{named(locale, s)} · {s.status}</Link>)}
          {partner.vehicles.map((v) => <Link key={v.id} href={`/admin/vehicles/${v.id}`} className="pill bg-sky-50 text-sky-700">{locale === "bn" ? v.titleBn || v.title : v.title} · {v.status}</Link>)}
          {partner.properties.map((p) => <Link key={p.id} href={`/admin/stays/${p.id}`} className="pill bg-teal-50 text-teal-700">{named(locale, p)} · {p.status}</Link>)}
          {!partner.stores.length && !partner.vehicles.length && !partner.properties.length ? <span className="text-muted-foreground">{pick(locale, "কিছু লিস্ট করা নেই।", "Nothing listed.")}</span> : null}
        </p>
      </Section>

      <Section title={pick(locale, `চলমান অর্ডার (${open.length})`, `Open orders (${open.length})`)}>
        {!open.length ? <p className="py-3 text-sm text-muted-foreground">{pick(locale, "এখন কোনো চলমান অর্ডার নেই।", "No open orders.")}</p> : (
          <ul className="divide-y divide-line">
            {open.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Link href={`/admin/bookings/${b.code}`} className="font-extrabold text-brand">{b.code}</Link>
                <span className="flex-1 truncate">{named(locale, b.offering)} · {b.customer.name} · {formatDay(b.visitDate, locale)}</span>
                <span className="font-bold text-ink">{taka(b.finalPrice ?? b.estimatedPrice + b.extraCharge, locale)}</span>
                <StatusPill status={b.status} locale={locale} flow={b.category.flow} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={pick(locale, `হিসাব · শেষ করা ${ledger.totals.count}টা অর্ডার`, `Ledger · ${ledger.totals.count} completed orders`)}>
        {!ledger.rows.length ? <p className="py-3 text-sm text-muted-foreground">{pick(locale, "এখনো কোনো অর্ডার শেষ হয়নি।", "No completed orders yet.")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">{pick(locale, "অর্ডার", "Order")}</th><th>{pick(locale, "তারিখ", "Date")}</th><th className="text-right">{pick(locale, "বিল", "Bill")}</th><th className="text-right">{pick(locale, "পার্টনার", "Partner")}</th><th className="text-right">HANDYO</th><th className="text-right">{pick(locale, "পেমেন্ট", "Paid")}</th></tr></thead>
              <tbody className="divide-y divide-line">
                {ledger.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2"><Link href={`/admin/bookings/${r.code}`} className="font-bold text-brand">{r.code}</Link> <span className="text-muted-foreground">{locale === "bn" ? r.titleBn : r.title}</span></td>
                    <td>{formatDay(r.day, locale)}</td>
                    <td className="text-right font-bold text-ink">{taka(r.gross, locale)}</td>
                    <td className="text-right">{taka(r.partner, locale)}</td>
                    <td className="text-right">{taka(r.handyo, locale)}</td>
                    <td className="text-right">{r.paid ? <span className="pill bg-emerald-100 text-emerald-800">{pick(locale, "হয়েছে", "yes")}</span> : <span className="pill bg-amber-100 text-amber-800">{pick(locale, "বাকি", "due")}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={pick(locale, "হেল্পার (সর্বোচ্চ ২ জন)", "Helpers (max 2)")}>
        {!helpers.length ? <p className="py-3 text-sm text-muted-foreground">{pick(locale, "এই পার্টনারের কোনো হেল্পার নেই।", "No helpers.")}</p> : (
          <ul className="divide-y divide-line">
            {helpers.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1"><span className="font-bold text-ink">{h.name}</span> <span className="text-muted-foreground">· {h.phone}</span></span>
                <span className={`pill ${h.helperStatus === "APPROVED" ? "bg-emerald-100 text-emerald-800" : h.helperStatus === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-canvas text-muted-foreground"}`}>{h.helperStatus === "APPROVED" ? pick(locale, "অনুমোদিত", "approved") : h.helperStatus === "PENDING" ? pick(locale, "অপেক্ষায়", "waiting") : pick(locale, "নাকচ", "rejected")}</span>
                {h.helperStatus === "PENDING" ? <ActionForm action={reviewHelperAction} resetOnSuccess={false} className="inline"><input type="hidden" name="id" value={h.id} /><input type="hidden" name="decision" value="APPROVE" /><SubmitButton className="btn-primary h-8 px-3 text-xs">{pick(locale, "অনুমোদন", "Approve")}</SubmitButton></ActionForm> : null}
                <ActionForm action={reviewHelperAction} resetOnSuccess={false} className="inline"><input type="hidden" name="id" value={h.id} /><input type="hidden" name="decision" value="REMOVE" /><SubmitButton className="btn-soft h-8 px-3 text-xs">{pick(locale, "সরান", "Remove")}</SubmitButton></ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
