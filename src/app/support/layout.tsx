import Link from "next/link"
import { requireUser, getLocale } from "@/lib/auth"
import { isAdmin, OFFICE } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { unreadForOffice } from "@/lib/support"
import { named, pick } from "@/lib/i18n"
import { PanelShell, type NavItem } from "@/components/shell/nav"

export default async function SupportLayout({ children }: { children: React.ReactNode }) {
  const [user, locale] = await Promise.all([requireUser(OFFICE, "/support"), getLocale()])
  const shop = await officeShop(user)
  const unread = await unreadForOffice(user, shop.id)
  const items: NavItem[] = [
    { href: "/support", label: pick(locale, "ইনবক্স", "Inbox"), icon: "inbox", exact: true, badge: unread },
    { href: "/support/bookings", label: pick(locale, "বুকিং", "Bookings"), icon: "list" },
    { href: "/support/tickets", label: pick(locale, "টিকেট", "Tickets"), icon: "help" },
    { href: "/support/templates", label: pick(locale, "টেমপ্লেট", "Templates"), icon: "chat" },
    ...(isAdmin(user.role) ? [{ href: "/admin", label: pick(locale, "অ্যাডমিন", "Admin"), icon: "dashboard" as const }] : []),
  ]
  return (
    <PanelShell title={`${pick(locale, "কাস্টমার কেয়ার", "Customer care")} · ${named(locale, shop)}`} items={items} user={{ name: user.name, role: user.role }} locale={locale}>
      {user.role === "OWNER" ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-brand-soft px-4 py-2 text-sm">
          <span className="min-w-0 truncate text-ink">
            {pick(locale, "বর্তমান শপ:", "Current shop:")} <span className="font-extrabold">{named(locale, shop)}</span>
          </span>
          <Link href="/admin/shops" className="shrink-0 font-bold text-brand">{pick(locale, "শপ বদলান →", "Switch shop →")}</Link>
        </div>
      ) : null}
      {children}
    </PanelShell>
  )
}
