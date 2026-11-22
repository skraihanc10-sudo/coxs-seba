import Link from "next/link"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { db } from "@/lib/db"
import { allShops, officeShop } from "@/lib/shops"
import { unreadForOffice } from "@/lib/support"
import { pick } from "@/lib/i18n"
import { PanelShell, type NavItem } from "@/components/shell/nav"
import { ShopSwitch } from "@/components/admin/shop-switch"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin"), getLocale()])
  const shop = await officeShop(user)
  const owner = user.role === "OWNER"
  const [waiting, pendingVehicles, unread, shops] = await Promise.all([
    db.serviceBooking.count({ where: { shopId: shop.id, status: "REQUESTED" } }),
    db.vehicle.count({ where: { shopId: shop.id, status: "PENDING" } }),
    unreadForOffice(user, shop.id),
    owner ? allShops() : Promise.resolve([]),
  ])
  const items: NavItem[] = [
    { href: "/admin", label: pick(locale, "ড্যাশবোর্ড", "Dashboard"), icon: "dashboard", exact: true },
    { href: "/admin/bookings", label: pick(locale, "বুকিং", "Bookings"), icon: "list", badge: waiting },
    { href: "/admin/workers", label: pick(locale, "কর্মী", "Workers"), icon: "workers" },
    { href: "/admin/vehicles", label: pick(locale, "গাড়ি", "Vehicles"), icon: "car", badge: pendingVehicles },
    { href: "/admin/customers", label: pick(locale, "কাস্টমার", "Customers"), icon: "users" },
    { href: "/admin/services", label: pick(locale, "সেবা ও দাম", "Services & prices"), icon: "services" },
    { href: "/admin/coupons", label: pick(locale, "কুপন", "Coupons"), icon: "tag" },
    { href: "/admin/areas", label: pick(locale, "এলাকা", "Areas"), icon: "map" },
    { href: "/support", label: pick(locale, "সাপোর্ট ইনবক্স", "Support inbox"), icon: "inbox", badge: unread },
    { href: "/admin/reports", label: pick(locale, "রিপোর্ট", "Reports"), icon: "reports" },
    { href: "/admin/staff", label: pick(locale, "স্টাফ", "Staff"), icon: "staff" },
    { href: "/admin/settings", label: pick(locale, "সেটিংস", "Settings"), icon: "settings" },
    ...(owner ? [{ href: "/admin/shops", label: pick(locale, "শপ", "Shops"), icon: "grid" as const }] : []),
  ]
  const shopName = pick(locale, shop.nameBn, shop.name)
  return (
    <PanelShell title={`${pick(locale, "অ্যাডমিন", "Admin")} · HANDYO ${shopName}`} items={items} user={{ name: user.name, role: user.role }} locale={locale}>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm ring-1 ring-line">
        <p className="min-w-0 flex-1 truncate">
          <span className="text-muted-foreground">{pick(locale, "এখন যে শপে কাজ করছেন:", "Working in:")}</span> <span className="font-extrabold text-ink">{shopName}</span>
          <span className="ml-1 text-xs text-muted-foreground">· {pick(locale, shop.cityBn, shop.city)}</span>
          {!shop.active ? <span className="pill ml-2 bg-rose-100 text-rose-700">{pick(locale, "বন্ধ", "Off")}</span> : null}
        </p>
        {owner ? (
          <>
            <ShopSwitch shops={shops} current={shop.id} locale={locale} />
            <Link href="/admin/shops" className="text-xs font-bold text-brand">{pick(locale, "সব শপ", "All shops")} →</Link>
          </>
        ) : null}
      </div>
      {children}
    </PanelShell>
  )
}
