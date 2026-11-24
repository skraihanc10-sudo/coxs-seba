import Link from "next/link"
import { BadgeCheck, ChevronLeft, MessageSquareText, ShieldCheck, Wallet } from "lucide-react"
import type { Locale } from "@/lib/format"
import { taka } from "@/lib/format"
import { flowFor, statusText, statusTone } from "@/lib/booking-flow"

export function PageHeader({ title, sub, back, action }: { title: string; sub?: string; back?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {back ? (
        <Link href={back} aria-label="Back" className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-paper ring-1 ring-line">
          <ChevronLeft className="size-5" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="display text-2xl font-extrabold text-ink md:text-3xl">{title}</h1>
        {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
      </div>
      {action}
    </div>
  )
}

/** `flow` is the category flow ("STAY" reads as resort wording). */
export function StatusPill({ status, locale, className = "", flow }: { status: string; locale: Locale; className?: string; flow?: string }) {
  return <span className={`pill ${statusTone(status)} ${className}`}>{statusText(status, locale, flow ? flowFor(flow) : undefined)}</span>
}

export function Money({ value, locale, className = "" }: { value: number; locale: Locale; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{taka(value, locale)}</span>
}

export function EmptyState({ title, body, href, action }: { title: string; body?: string; href?: string; action?: string }) {
  return (
    <div className="card px-6 py-12 text-center">
      <p className="text-lg font-extrabold text-ink">{title}</p>
      {body ? <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p> : null}
      {href && action ? (
        <Link href={href} className="btn-primary mt-5 inline-flex">
          {action}
        </Link>
      ) : null}
    </div>
  )
}

export function Section({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-4 md:p-5 ${className}`}>
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? <h2 className="display text-lg font-extrabold text-ink">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-[15px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-ink">{children}</span>
    </div>
  )
}

export function Avatar({ name, src, size = 44 }: { name: string; src?: string; size?: number }) {
  const initial = name.trim().charAt(0) || "?"
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} className="shrink-0 rounded-full object-cover ring-1 ring-line" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-brand-soft font-extrabold text-brand" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initial}
    </span>
  )
}

export function Photos({ photos, locale }: { photos: Array<{ id: string; path: string; kind: string }>; locale: Locale }) {
  if (!photos.length) return null
  const label = (kind: string) =>
    kind === "BEFORE" ? (locale === "bn" ? "আগে" : "Before") : kind === "AFTER" ? (locale === "bn" ? "পরে" : "After") : locale === "bn" ? "কাস্টমারের ছবি" : "Customer"
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((p) => (
        <a key={p.id} href={`/api/uploads/${p.path}`} target="_blank" rel="noreferrer" className="relative block aspect-square overflow-hidden rounded-xl ring-1 ring-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/uploads/${p.path}`} alt={label(p.kind)} className="size-full object-cover" loading="lazy" />
          <span className="absolute bottom-1 left-1 rounded-md bg-ink/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{label(p.kind)}</span>
        </a>
      ))}
    </div>
  )
}

/** Three small trust points under a price card: verified, fixed price, pay at the end, chat. */
export function TrustStrip({ locale, items }: { locale: Locale; items?: Array<[string, string]> }) {
  const bn = locale === "bn"
  const rows: Array<[typeof ShieldCheck, string, string]> = items
    ? items.map(([a, b], i) => [[ShieldCheck, BadgeCheck, Wallet, MessageSquareText][i % 4], a, b])
    : [
        [ShieldCheck, bn ? "যাচাই করা" : "Verified", bn ? "HANDYO অফিস দেখে অনুমোদন দেয়" : "Approved by the HANDYO office"],
        [BadgeCheck, bn ? "দাম আগেই লেখা" : "Price up front", bn ? "লুকানো চার্জ নেই" : "No hidden charges"],
        [Wallet, bn ? "পরে পেমেন্ট" : "Pay at the end", bn ? "ক্যাশ / বিকাশ / নগদ" : "Cash / bKash / Nagad"],
        [MessageSquareText, bn ? "অ্যাপে চ্যাট" : "In-app chat", bn ? "অফিস ও পার্টনারের সাথে" : "With office and partner"],
      ]
  return (
    <ul className="grid grid-cols-2 gap-2">
      {rows.map(([Icon, title, body]) => (
        <li key={title} className="flex items-start gap-2 rounded-2xl bg-paper p-3 ring-1 ring-line">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden><Icon className="size-4" /></span>
          <span className="min-w-0">
            <span className="block text-[13px] font-extrabold leading-tight text-ink">{title}</span>
            <span className="block text-[11px] leading-snug text-muted-foreground">{body}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
