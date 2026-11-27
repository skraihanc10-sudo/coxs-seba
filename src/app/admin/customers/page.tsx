import Link from "next/link"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { db } from "@/lib/db"
import { formatWhen, taka } from "@/lib/format"
import { pick } from "@/lib/i18n"
import { PageHeader } from "@/components/bits"

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }, user, locale] = await Promise.all([searchParams, requireUser(ADMINS, "/admin/customers"), getLocale()])
  const shop = await officeShop(user)
  const needle = q.trim()
  const customers = await db.user.findMany({
    where: { role: "CUSTOMER", bookings: { some: { shopId: shop.id } }, ...(needle ? { OR: [{ name: { contains: needle } }, { phone: { contains: needle } }, { email: { contains: needle } }] } : {}) },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      bookings: { where: { shopId: shop.id }, select: { status: true, finalPrice: true, estimatedPrice: true, createdAt: true } },
    },
  })
  return (
    <div>
      <PageHeader title={pick(locale, "কাস্টমার", "Customers")} sub={pick(locale, `${shop.nameBn} শপে বুকিং করেছেন ${customers.length} জন`, `${customers.length} people who booked with ${shop.name}`)} />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} className="field h-10 max-w-sm" placeholder={pick(locale, "নাম, ফোন বা ইমেইল", "Name, phone or email")} />
        <button className="btn-primary h-10 px-4 text-sm">{pick(locale, "খুঁজুন", "Search")}</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table min-w-[720px]">
          <thead><tr><th>{pick(locale, "নাম", "Name")}</th><th>{pick(locale, "ফোন / ইমেইল", "Phone / email")}</th><th>{pick(locale, "বুকিং", "Bookings")}</th><th className="text-right">{pick(locale, "মোট খরচ", "Spent")}</th><th>{pick(locale, "শেষ বুকিং", "Last booking")}</th><th>{pick(locale, "যোগ দিয়েছেন", "Joined")}</th></tr></thead>
          <tbody>
            {customers.map((c) => {
              const done = c.bookings.filter((b) => b.status === "COMPLETED")
              const last = c.bookings.map((b) => b.createdAt).sort((a, b) => b.getTime() - a.getTime())[0]
              return (
                <tr key={c.id} className="hover:bg-canvas">
                  <td><Link href={`/admin/customers/${c.id}`} className="font-extrabold text-brand">{c.name}</Link>{!c.active ? <span className="pill ml-2 bg-rose-100 text-rose-700">{pick(locale, "বন্ধ", "Off")}</span> : null}</td>
                  <td>{c.phone ?? ""} {c.email ? <span className="text-muted-foreground">{c.email}</span> : null}</td>
                  <td>{c.bookings.length} <span className="text-muted-foreground">({done.length} {pick(locale, "শেষ", "done")})</span></td>
                  <td className="text-right font-extrabold">{taka(done.reduce((s, b) => s + (b.finalPrice ?? b.estimatedPrice), 0), locale)}</td>
                  <td className="text-muted-foreground">{last ? formatWhen(last, locale) : "—"}</td>
                  <td className="text-muted-foreground">{formatWhen(c.createdAt, locale)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
