import Link from "next/link"
import { Phone, MessageCircle, UserRound, MapPin, Handshake, Mail, ShieldCheck } from "lucide-react"
import { Logo } from "@/components/logo"
import { LocaleSwitch } from "@/components/locale-switch"
import { ShopSwitch } from "@/components/shop-switch"
import { BottomNav, TopNav, type NavItem } from "./nav"
import { getLocale, getUser } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { activeShops, coverageText, currentShop } from "@/lib/shops"
import { pick, words } from "@/lib/i18n"
import { telHref, whatsappHref } from "@/lib/format"
import { unreadNotices } from "@/lib/notify"
import { unreadMessages } from "@/lib/support"
import { homeFor } from "@/lib/roles"
import { brand } from "@/theme/brand"

const Facebook = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8h3.3Z" /></svg>
)
const Youtube = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M23 7.2a2.9 2.9 0 0 0-2-2C19.2 4.7 12 4.7 12 4.7s-7.2 0-9 .5a2.9 2.9 0 0 0-2 2A30 30 0 0 0 .5 12a30 30 0 0 0 .5 4.8 2.9 2.9 0 0 0 2 2c1.8.5 9 .5 9 .5s7.2 0 9-.5a2.9 2.9 0 0 0 2-2 30 30 0 0 0 .5-4.8 30 30 0 0 0-.5-4.8ZM9.7 15.1V8.9l6 3.1-6 3.1Z" /></svg>
)

/** Public site and customer area: top bar, phone tabs, footer. Everything shown is the current shop's. */
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const [locale, user, shop, shops] = await Promise.all([getLocale(), getUser(), currentShop(), activeShops()])
  const settings = await getSettings(shop.id)
  const t = words(locale)
  const bn = locale === "bn"
  const customer = user?.role === "CUSTOMER"
  const [notices, messages] = customer ? await Promise.all([unreadNotices(user.id), unreadMessages(user)]) : [0, 0]
  const helpline = shop.phone || settings.helpline
  const whatsapp = shop.whatsapp || settings.whatsapp
  const address = bn ? shop.addressBn || settings.address : shop.address || settings.addressEn
  const social = [
    settings.facebook ? { label: "Facebook", href: settings.facebook, external: true, icon: <Facebook className="size-5" /> } : null,
    settings.youtube ? { label: "YouTube", href: settings.youtube, external: true, icon: <Youtube className="size-5" /> } : null,
    { label: "WhatsApp", href: whatsappHref(whatsapp), external: true, icon: <MessageCircle className="size-5" aria-hidden /> },
    { label: pick(locale, "ইমেইল", "Email"), href: `mailto:${settings.supportEmail || brand.supportEmail}`, external: false, icon: <Mail className="size-5" aria-hidden /> },
    { label: pick(locale, "হেল্পলাইন", "Helpline"), href: telHref(helpline), external: false, icon: <Phone className="size-5" aria-hidden /> },
  ].filter((x) => x !== null)
  const items: NavItem[] = [
    { href: "/", label: t.home, icon: "home", exact: true },
    { href: "/services", label: t.services, icon: "grid" },
    { href: "/bookings", label: t.bookings, icon: "list", badge: messages },
    { href: "/help", label: t.help, icon: "help" },
    { href: "/profile", label: t.profile, icon: "user", badge: notices },
  ]
  const shopOptions = shops.map((s) => ({ slug: s.slug, name: s.name, nameBn: s.nameBn, city: s.city, cityBn: s.cityBn }))
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="site-header">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-4 md:gap-4 md:px-6">
          <Link href="/" aria-label={`${brand.name} ${pick(locale, "হোম", "home")}`}>
            <Logo bn={bn} short light />
          </Link>
          <nav aria-label={pick(locale, "প্রধান মেনু", "Main menu")} className="ml-4 hidden items-center gap-6 md:flex">
            <TopNav
              items={[
                { href: "/services", label: t.services },
                { href: "/how-it-works", label: pick(locale, "কীভাবে কাজ করে", "How it works") },
                { href: "/branches", label: pick(locale, "শাখা", "Branches") },
                { href: "/help", label: t.help },
              ]}
            />
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ShopSwitch shops={shopOptions} current={shop.slug} locale={locale} light />
            <Link href="/partner" className="btn-cyan hidden h-9 items-center gap-1.5 rounded-full px-3.5 text-xs lg:inline-flex">
              <Handshake className="size-3.5" aria-hidden /> {pick(locale, "পার্টনার হোন", "Become a partner")}
            </Link>
            <a href={telHref(helpline)} className="grid size-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 md:hidden" aria-label={`${t.call} ${helpline}`}>
              <Phone className="size-4" aria-hidden />
            </a>
            <LocaleSwitch locale={locale} light />
            {user ? (
              <Link href={customer ? "/profile" : homeFor(user.role)} className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ring-1 ring-line md:inline-flex">
                <UserRound className="size-4" aria-hidden /> {user.name.split(" ")[0]}
              </Link>
            ) : (
              <Link href="/login" className="hidden rounded-full bg-ink px-4 py-2 text-sm font-bold text-white md:inline-flex">
                {t.login}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-10 md:px-6 md:pt-8 md:pb-16">{children}</main>

      <footer className="navy-glow mt-10 rounded-none" aria-label={pick(locale, "ফুটার", "Footer")}>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr_1.2fr] md:px-6 md:py-14">
          <div>
            <Logo bn={bn} light />
            <p className="mt-3 max-w-xs text-sm text-white/70">{bn ? brand.taglineBn : brand.tagline}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
              <MapPin className="size-3.5" aria-hidden /> {coverageText(shop, locale)}
            </p>
          </div>
          <div className="text-sm">
            <p className="font-extrabold">{pick(locale, "আমাদের সাথে থাকুন", "Stay connected")}</p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={pick(locale, "সোশ্যাল মিডিয়া ও যোগাযোগ", "Social media & contact")}>
              {social.map((x) => (
                <li key={x.label}>
                  <a href={x.href} target={x.external ? "_blank" : undefined} rel={x.external ? "noopener noreferrer" : undefined} title={x.label} aria-label={x.label} className="grid size-11 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white hover:text-ink">
                    {x.icon}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-white/60">{pick(locale, "ফেসবুক · ইউটিউব · হোয়াটসঅ্যাপ · ইমেইল · হেল্পলাইন", "Facebook · YouTube · WhatsApp · Email · Helpline")}</p>
          </div>
          <div className="text-sm">
            <p className="font-extrabold">{bn ? shop.nameBn : shop.name}</p>
            <address className="mt-3 not-italic text-white/70">{address}</address>
            <p className="mt-1 text-white/70">{bn ? settings.officeHours : settings.officeHoursEn}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-white/70"><Mail className="size-3.5" aria-hidden /> {brand.supportEmail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={telHref(helpline)} className="btn h-10 bg-white px-4 text-sm text-ink hover:bg-white/90">
                <Phone className="size-4" aria-hidden /> {helpline}
              </a>
              <a href={whatsappHref(whatsapp)} className="btn h-10 bg-white/10 px-4 text-sm text-white ring-1 ring-white/20 hover:bg-white/20">
                <MessageCircle className="size-4" aria-hidden /> {t.whatsapp}
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-white/60 md:flex-row md:items-center md:justify-between md:px-6">
            <p>© {new Date().getFullYear()} {brand.name} · {shops.map((s) => (bn ? s.cityBn : s.city)).join(" · ")}</p>
            <p className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" aria-hidden /> {pick(locale, "যাচাই করা টিম ও পার্টনার · পার্টনার ব্যবসা থেকে HANDYO মাত্র ১০% রাখে", "Verified team & partners · HANDYO keeps only 10% of every partner business")}</p>
          </div>
        </div>
        <div className="h-20 md:hidden" aria-hidden />
      </footer>

      <BottomNav items={items} />
    </div>
  )
}
