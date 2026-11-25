import Link from "next/link"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { partnerOverview } from "@/lib/partners"
import { named, pick } from "@/lib/i18n"
import { setOfficeListAction } from "@/actions/partners"
import { Avatar, PageHeader } from "@/components/bits"

/**
 * Every partner (store, vehicle and resort owners) in one list: what they
 * list, open orders, helpers, the "list in office" switch and a link to their
 * ledger.
 */
export default async function PartnersPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/partners"), getLocale()])
  const shop = await officeShop(user)
  const partners = await partnerOverview(user.role === "OWNER" ? null : shop.id)
  const bn = locale === "bn"
  return (
    <div>
      <PageHeader title={pick(locale, "পার্টনার ও হিসাব", "Partners & ledger")} sub={pick(locale, `${partners.length} জন পার্টনার · দোকান, গাড়ি ও রিসোর্টের মালিক`, `${partners.length} partners · store, vehicle and resort owners`)} />
      <p className="mb-4 rounded-2xl bg-canvas px-4 py-3 text-sm text-muted-foreground">{pick(locale, "“অফিস তালিকায়” বন্ধ করলে সেই পার্টনারের অর্ডার বুকিং পেজে দেখাবে না (পার্টনার নিজেই সামলাবে); এখানে আর পার্টনারের পেজে সব সময় দেখা যাবে। বাতিল আর এক্সট্রা চার্জ সব সময় অফিসের অনুমোদনে হয়।", "Switch “list in office” off and that partner's orders stay off the booking pages (the partner handles them); you still see everything here and on the partner's page. Cancellations and extra charges always need office approval.")}</p>
      {!partners.length ? <p className="card p-6 text-center text-sm text-muted-foreground">{pick(locale, "এখনো কোনো পার্টনার নেই।", "No partners yet.")}</p> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {partners.map((p) => {
          const live = (xs: Array<{ status: string }>) => xs.filter((x) => x.status === "APPROVED").length
          const helpers = p.helpers.filter((h) => h.helperStatus === "APPROVED").length
          const waitingHelpers = p.helpers.filter((h) => h.helperStatus === "PENDING").length
          return (
            <div key={p.id} className={`card p-4 ${p.user.active ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-3">
                <Avatar name={p.user.name} src={p.photo || undefined} size={44} />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/partners/${p.id}`} className="block truncate font-extrabold text-ink hover:text-brand">{p.user.name}</Link>
                  <p className="text-xs text-muted-foreground">{p.user.phone}{!p.approved ? ` · ${pick(locale, "অনুমোদনের অপেক্ষায়", "waiting for approval")}` : ""}</p>
                </div>
                <span className={`pill ${p.openOrders ? "bg-emerald-100 text-emerald-800" : "bg-canvas text-muted-foreground"}`}>{p.openOrders} {pick(locale, "চলমান", "open")}</span>
              </div>
              <p className="mt-3 flex flex-wrap gap-1 text-xs">
                {p.stores.map((s) => <Link key={s.id} href={`/admin/stores/${s.id}`} className="pill bg-brand-soft text-brand hover:bg-brand/15">{named(locale, s)}</Link>)}
                {p.vehicles.length ? <Link href="/admin/vehicles" className="pill bg-sky-50 text-sky-700">{pick(locale, `${live(p.vehicles)}/${p.vehicles.length} গাড়ি`, `${live(p.vehicles)}/${p.vehicles.length} vehicles`)}</Link> : null}
                {p.properties.length ? <Link href="/admin/stays" className="pill bg-teal-50 text-teal-700">{pick(locale, `${live(p.properties)} রিসোর্ট`, `${live(p.properties)} resorts`)}</Link> : null}
                <span className="pill bg-canvas text-muted-foreground">{pick(locale, `${helpers}/2 হেল্পার`, `${helpers}/2 helpers`)}{waitingHelpers ? ` · ${waitingHelpers} ${pick(locale, "অপেক্ষায়", "waiting")}` : ""}</span>
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <form action={setOfficeListAction} className="flex items-center gap-2">
                  <input type="hidden" name="workerId" value={p.id} />
                  <input type="hidden" name="on" value={p.officeList ? "0" : "1"} />
                  <button className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 font-bold ring-1 transition ${p.officeList ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-canvas text-muted-foreground ring-line"}`} title={pick(locale, "টগল", "Toggle")}>
                    <span className={`size-2 rounded-full ${p.officeList ? "bg-emerald-500" : "bg-line"}`} aria-hidden />
                    {p.officeList ? pick(locale, "অফিস তালিকায়: চালু", "List in office: on") : pick(locale, "অফিস তালিকায়: বন্ধ", "List in office: off")}
                  </button>
                </form>
                <Link href={`/admin/partners/${p.id}`} className="font-bold text-brand">{bn ? "হিসাব ও অর্ডার →" : "Ledger & orders →"}</Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
