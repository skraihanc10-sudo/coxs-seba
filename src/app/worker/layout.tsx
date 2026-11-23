import { requireUser, getLocale } from "@/lib/auth"
import { unreadNotices } from "@/lib/notify"
import { unreadMessages } from "@/lib/support"
import { pick } from "@/lib/i18n"
import { PanelShell, type NavItem } from "@/components/shell/nav"

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const [user, locale] = await Promise.all([requireUser(["WORKER"], "/worker"), getLocale()])
  const [notices, messages] = await Promise.all([unreadNotices(user.id), unreadMessages(user)])
  const partner = user.worker?.kind === "PARTNER"
  const items: NavItem[] = [
    { href: "/worker", label: partner ? pick(locale, "অর্ডার", "Orders") : pick(locale, "আজকের জব", "Jobs"), icon: "list", exact: true, badge: messages },
    ...(partner ? [{ href: "/worker/vehicles", label: pick(locale, "আমার গাড়ি", "My vehicles"), icon: "car" } satisfies NavItem, { href: "/worker/stays", label: pick(locale, "আমার রিসোর্ট", "My resorts"), icon: "building" } satisfies NavItem] : []),
    { href: "/worker/earnings", label: pick(locale, "আয়", "Earnings"), icon: "wallet" },
    { href: "/worker/notifications", label: pick(locale, "নোটিশ", "Alerts"), icon: "bell", badge: notices },
    { href: "/worker/account", label: pick(locale, "অ্যাকাউন্ট", "Account"), icon: "user" },
  ]
  return (
    <PanelShell title={partner ? pick(locale, "পার্টনার প্যানেল", "Partner panel") : pick(locale, "কর্মী অ্যাপ", "Worker app")} items={items} user={{ name: user.name, role: user.role }} locale={locale}>
      {children}
    </PanelShell>
  )
}
