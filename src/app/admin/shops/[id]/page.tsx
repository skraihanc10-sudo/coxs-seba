import Link from "next/link"
import { notFound } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { ROLE_LABEL } from "@/lib/roles"
import { allShops, officeShop } from "@/lib/shops"
import { pick } from "@/lib/i18n"
import { formatWhen } from "@/lib/format"
import { setOfficeShopAction, toggleShopAction } from "@/actions/admin"
import { PageHeader, Section } from "@/components/bits"
import { ShopForm } from "@/components/admin/shop-form"

export default async function ShopEditPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, locale] = await Promise.all([params, requireUser(["OWNER"], "/admin/shops"), getLocale()])
  const shop = await db.shop.findUnique({
    where: { id },
    include: {
      _count: { select: { workers: true, areas: true, categories: true, bookings: true, tickets: true, careThreads: true } },
      users: { where: { role: { in: ["ADMIN", "SUPPORT"] } }, orderBy: [{ role: "asc" }, { name: "asc" }] },
    },
  })
  if (!shop) notFound()
  const [current, shops, open, requested] = await Promise.all([
    officeShop(user),
    allShops(),
    db.serviceBooking.count({ where: { shopId: shop.id, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    db.serviceBooking.count({ where: { shopId: shop.id, status: "REQUESTED" } }),
  ])
  const here = current.id === shop.id
  const bn = locale === "bn"

  return (
    <div className="space-y-6">
      <PageHeader
        back="/admin/shops"
        title={bn ? shop.nameBn : shop.name}
        sub={`${bn ? shop.cityBn : shop.city} · /${shop.slug} · ${shop.kind === "PARTNER" ? pick(locale, "পার্টনার শপ", "Partner shop") : pick(locale, "আমাদের শাখা", "Our branch")} · ${pick(locale, "তৈরি", "created")} ${formatWhen(shop.createdAt, locale)}`}
        action={
          <span className="flex flex-wrap items-center gap-2">
            <span className={`pill ${shop.active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>{shop.active ? pick(locale, "চালু", "On") : pick(locale, "বন্ধ", "Off")}</span>
            <form action={toggleShopAction}>
              <input type="hidden" name="id" value={shop.id} />
              <button className="btn-ghost h-9 px-3 text-xs">{shop.active ? pick(locale, "বন্ধ করুন", "Turn off") : pick(locale, "চালু করুন", "Turn on")}</button>
            </form>
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <ShopForm locale={locale} shop={shop} shops={shops} />

        <div className="space-y-4">
          <Section title={pick(locale, "এই শপে কাজ করুন", "Work in this shop")}>
            {here ? (
              <p className="text-sm text-muted-foreground">{pick(locale, "আপনি এখন এই শপেই কাজ করছেন। বাম পাশের মেনু থেকে বুকিং, কর্মী, সেবা, স্টাফ দেখুন।", "You are already working in this shop. Use the menu for bookings, workers, services and staff.")}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{pick(locale, "সুইচ করলে অ্যাডমিন প্যানেলের সব পেজ এই শপের তথ্য দেখাবে।", "Switching makes every admin page show this shop's data.")}</p>
            )}
            <div className="mt-3 grid gap-2">
              {[
                ["/admin", pick(locale, "ড্যাশবোর্ড", "Dashboard")],
                ["/admin/bookings", pick(locale, "বুকিং", "Bookings")],
                ["/admin/workers", pick(locale, "কর্মী", "Workers")],
                ["/admin/services", pick(locale, "সেবা ও দাম", "Services & prices")],
                ["/admin/areas", pick(locale, "এলাকা", "Areas")],
                ["/admin/staff", pick(locale, "স্টাফ", "Staff")],
                ["/admin/settings", pick(locale, "সেটিংস", "Settings")],
                ["/support", pick(locale, "সাপোর্ট ইনবক্স", "Support inbox")],
              ].map(([href, label]) => (
                <form key={href} action={setOfficeShopAction}>
                  <input type="hidden" name="shopId" value={shop.id} />
                  <input type="hidden" name="back" value={href} />
                  <button className="btn-soft h-9 w-full justify-between px-3 text-sm">{label} <span aria-hidden>→</span></button>
                </form>
              ))}
            </div>
          </Section>

          <Section title={pick(locale, "এক নজরে", "Quick facts")}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <Fact label={pick(locale, "মোট বুকিং", "Total bookings")} value={String(shop._count.bookings)} />
              <Fact label={pick(locale, "খোলা বুকিং", "Open bookings")} value={String(open)} />
              <Fact label={pick(locale, "কর্মী দরকার", "Needs a worker")} value={String(requested)} warn={requested > 0} />
              <Fact label={pick(locale, "কর্মী", "Workers")} value={String(shop._count.workers)} />
              <Fact label={pick(locale, "এলাকা", "Areas")} value={String(shop._count.areas)} />
              <Fact label={pick(locale, "সেবা ক্যাটাগরি", "Service categories")} value={String(shop._count.categories)} />
              <Fact label={pick(locale, "টিকেট", "Tickets")} value={String(shop._count.tickets)} />
              <Fact label={pick(locale, "কেয়ার চ্যাট", "Care chats")} value={String(shop._count.careThreads)} />
            </dl>
          </Section>

          <Section title={pick(locale, "এই শপের স্টাফ", "Staff of this shop")} action={<Link href="/admin/staff" className="text-xs font-bold text-brand">{pick(locale, "স্টাফ পেজ", "Staff page")} →</Link>}>
            <ul className="divide-y divide-line text-sm">
              {shop.users.map((u) => (
                <li key={u.id} className={`flex items-center gap-2 py-2 ${u.active ? "" : "opacity-60"}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink">{u.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{u.email}{u.phone ? ` · ${u.phone}` : ""}</span>
                  </span>
                  <span className="pill bg-brand-soft text-brand">{ROLE_LABEL[u.role]?.[locale]}</span>
                  {!u.active ? <span className="pill bg-rose-100 text-rose-700">{pick(locale, "বন্ধ", "Off")}</span> : null}
                </li>
              ))}
              {!shop.users.length ? <li className="py-3 text-sm text-muted-foreground">{pick(locale, "এখনো কোনো স্টাফ নেই। সুইচ করে স্টাফ পেজ থেকে যোগ করুন।", "No staff yet. Switch in and add some on the Staff page.")}</li> : null}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Fact({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={`font-extrabold ${warn ? "text-amber-600" : "text-ink"}`}>{value}</dd>
    </div>
  )
}
