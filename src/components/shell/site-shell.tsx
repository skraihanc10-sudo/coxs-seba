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
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-4 md:gap-4 md:px-6">
          <Link href="/" aria-label={`${brand.name} ${pick(locale, "হোম", "home")}`}>
            <Logo bn={bn} short />
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
            <ShopSwitch shops={shopOptions} current={shop.slug} locale={locale} />
            <Link href="/partner" className="hidden items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-2 text-xs font-extrabold text-brand transition hover:bg-brand hover:text-white lg:inline-flex">
              <Handshake className="size-3.5" aria-hidden /> {pick(locale, "পার্টনার হোন", "Become a partner")}
            </Link>
            <a href={telHref(helpline)} className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand md:hidden" aria-label={`${t.call} ${helpline}`}>
              <Phone className="size-4" aria-hidden />
            </a>
            <LocaleSwitch locale={locale} />
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

      <footer className="mt-10 bg-ink text-white" aria-label={pick(locale, "ফুটার", "Footer")}>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.3fr_1fr_1fr_1.2fr] md:px-6 md:py-14">
          <div>
            <Logo bn={bn} light />
            <p className="mt-3 max-w-xs text-sm text-white/70">{bn ? brand.taglineBn : brand.tagline}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
              <MapPin className="size-3.5" aria-hidden /> {coverageText(shop, locale)}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-white/80" aria-label={pick(locale, "পেমেন্ট", "Payment")}>
              {(bn ? ["ক্যাশ", "বিকাশ", "নগদ"] : ["Cash", "bKash", "Nagad"]).map((m) => (
                <li key={m} className="rounded-md bg-white/10 px-2.5 py-1">{m}</li>
              ))}
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-extrabold">{pick(locale, "সেবা", "Services")}</p>
            <ul className="mt-3 space-y-2 text-white/70">
              <li><Link href="/services/rent-a-car" className="hover:text-white">{pick(locale, "গাড়ি ও বাইক ভাড়া", "Car & bike rental")}</Link></li>
              <li><Link href="/services/resort-booking" className="hover:text-white">{pick(locale, "রিসোর্ট ও হোটেল বুকিং", "Resort & hotel booking")}</Link></li>
              <li><Link href="/services/shutki" className="hover:text-white">{pick(locale, "কক্সবাজারের শুঁটকি", "Cox's dried fish")}</Link></li>
              <li><Link href="/services/achar" className="hover:text-white">{pick(locale, "ঘরোয়া আচার", "Homemade pickles")}</Link></li>
              <li><Link href="/services" className="font-bold text-white">{pick(locale, "সব সেবা →", "All services →")}</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-extrabold">{pick(locale, "পার্টনার ও অফিস", "Partners & office")}</p>
            <ul className="mt-3 space-y-2 text-white/70">
              <li><Link href="/partner" className="hover:text-white">{pick(locale, "গাড়ি ভাড়া দিন", "Rent out your vehicle")}</Link></li>
              <li><Link href="/partner/resort" className="hover:text-white">{pick(locale, "রিসোর্ট যুক্ত করুন", "List your resort")}</Link></li>
              <li><Link href="/partner/store" className="hover:text-white">{pick(locale, "দোকান খুলুন", "Open a store")}</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white">{pick(locale, "কীভাবে কাজ করে", "How it works")}</Link></li>
              <li><Link href="/branches" className="hover:text-white">{pick(locale, "আমাদের শাখা", "Our branches")}</Link></li>
              <li><Link href="/login" className="hover:text-white">{pick(locale, "কর্মী বা অফিস লগইন", "Worker & office login")}</Link></li>
            </ul>
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
