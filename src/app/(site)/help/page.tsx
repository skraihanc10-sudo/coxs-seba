import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, MessageCircle, MessageSquareText, Phone, TicketCheck } from "lucide-react"
import { getLocale, getUser } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { activeFaqs } from "@/lib/catalog"
import { currentShop } from "@/lib/shops"
import { pick, words } from "@/lib/i18n"
import { telHref, whatsappHref } from "@/lib/format"
import { pageMeta } from "@/lib/seo"
import { PageHeader } from "@/components/bits"
import { breadcrumbs, faqLd, JsonLd } from "@/components/seo/json-ld"
import { myTickets, TICKET_STATUSES } from "@/lib/support"

export async function generateMetadata(): Promise<Metadata> {
  const [locale, shop] = await Promise.all([getLocale(), currentShop()])
  return pageMeta({
    locale,
    title: pick(locale, "সাহায্য ও যোগাযোগ", "Help & contact"),
    description: pick(
      locale,
      `HANDYO ${shop.cityBn}: হেল্পলাইন, হোয়াটসঅ্যাপ, ইমার্জেন্সি নম্বর, কাস্টমার কেয়ার চ্যাট আর সাধারণ প্রশ্নের উত্তর।`,
      `HANDYO ${shop.city}: helpline, WhatsApp, emergency number, customer care chat and answers to common questions.`,
    ),
    path: "/help",
  })
}

export default async function HelpPage() {
  const [locale, user, shop, faqs] = await Promise.all([getLocale(), getUser(), currentShop(), activeFaqs()])
  const settings = await getSettings(shop.id)
  const t = words(locale)
  const bn = locale === "bn"
  const tickets = user?.role === "CUSTOMER" ? await myTickets(user.id) : []
  const helpline = shop.phone || settings.helpline
  const whatsapp = shop.whatsapp || settings.whatsapp
  const address = bn ? shop.addressBn || settings.address : shop.address || settings.addressEn

  return (
    <div className="mx-auto max-w-2xl">
      <JsonLd
        data={[
          breadcrumbs([{ name: "HANDYO", path: "/" }, { name: t.help, path: "/help" }]),
          ...(faqs.length ? [faqLd(faqs.map((f) => ({ question: bn ? f.questionBn : f.question, answer: bn ? f.answerBn : f.answer })))] : []),
        ]}
      />
      <PageHeader title={t.help} sub={pick(locale, `${shop.nameBn} · আমরা সমাধান না হওয়া পর্যন্ত পাশে আছি।`, `${shop.name} · We stay with it until it's fixed.`)} />

      <a href={telHref(settings.emergency)} className="card mb-4 flex items-center gap-4 border-l-4 border-l-danger p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--danger-soft)] text-danger" aria-hidden><AlertTriangle className="size-5" /></span>
        <span>
          <span className="block font-extrabold text-ink">{pick(locale, "ইমার্জেন্সি? এখনই কল দিন", "Emergency? Call now")}</span>
          <span className="block text-sm text-muted-foreground">{settings.emergency} · {pick(locale, "পানি, বিদ্যুৎ বা গ্যাসের বিপদে ২৪ ঘণ্টা", "24h for water, electrical or gas danger")}</span>
        </span>
      </a>

      <div className="grid gap-3 sm:grid-cols-2">
        <a href={telHref(helpline)} className="card flex items-center gap-3 p-4">
          <Phone className="size-5 text-brand" aria-hidden />
          <span><span className="block font-extrabold text-ink">{pick(locale, "হেল্পলাইন", "Helpline")}</span><span className="block text-sm text-muted-foreground">{helpline}</span></span>
        </a>
        <a href={whatsappHref(whatsapp)} className="card flex items-center gap-3 p-4">
          <MessageCircle className="size-5 text-ok" aria-hidden />
          <span><span className="block font-extrabold text-ink">{t.whatsapp}</span><span className="block text-sm text-muted-foreground">{whatsapp}</span></span>
        </a>
        <Link href="/care" className="card flex items-center gap-3 p-4">
          <MessageSquareText className="size-5 text-brand" aria-hidden />
          <span><span className="block font-extrabold text-ink">{t.care}</span><span className="block text-sm text-muted-foreground">{pick(locale, "অ্যাপের ভেতরে চ্যাট করুন", "Chat with us in the app")}</span></span>
        </Link>
        <Link href="/help/tickets/new" className="card flex items-center gap-3 p-4">
          <TicketCheck className="size-5 text-amber" aria-hidden />
          <span><span className="block font-extrabold text-ink">{pick(locale, "অভিযোগ বা রিফান্ড", "Complaint or refund")}</span><span className="block text-sm text-muted-foreground">{pick(locale, "একটা টিকেট খুলুন", "Open a ticket")}</span></span>
        </Link>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        <span className="font-bold text-ink">{pick(locale, "অফিসের সময়:", "Office hours:")}</span> {bn ? settings.officeHours : settings.officeHoursEn} · {address}
      </p>

      {tickets.length ? (
        <section className="mt-6">
          <h2 className="display text-lg font-extrabold text-ink">{pick(locale, "আমার টিকেট", "My tickets")}</h2>
          <ul className="mt-2 space-y-2">
            {tickets.map((tk) => {
              const last = tk.messages[0]
              const unread = last && last.senderId !== user!.id && (!tk.reads[0] || tk.reads[0].readAt < last.createdAt)
              return (
                <li key={tk.id}>
                  <Link href={`/help/tickets/${tk.code}`} className="card flex items-center justify-between gap-3 p-4">
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-ink">{tk.code} · {tk.subject}</span>
                      <span className="block truncate text-xs text-muted-foreground">{last?.body}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {unread ? <span className="size-2.5 rounded-full bg-danger" aria-label={pick(locale, "নতুন উত্তর", "New reply")} /> : null}
                      <span className="pill bg-canvas text-ink">{TICKET_STATUSES[tk.status as keyof typeof TICKET_STATUSES]?.[locale] ?? tk.status}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="display text-lg font-extrabold text-ink">{pick(locale, "সাধারণ প্রশ্ন", "FAQ")}</h2>
        <div className="mt-2 space-y-2">
          {faqs.map((f) => (
            <details key={f.id} className="card group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-ink">
                {bn ? f.questionBn : f.question}
                <span className="text-brand transition group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{bn ? f.answerBn : f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
