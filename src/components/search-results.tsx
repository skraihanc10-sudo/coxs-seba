import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import type { Locale } from "@/lib/format"
import type { Hit, HitKind } from "@/lib/search-shared"
import { hitPrice, hitSub, hitTitle, KIND_TEXT } from "@/lib/search-shared"
import { pick } from "@/lib/i18n"

const ORDER: HitKind[] = ["category", "offering", "product", "vehicle", "stay"]
const GROUP: Record<HitKind, { bn: string; en: string }> = {
  category: { bn: "সেবা", en: "Services" },
  offering: { bn: "কাজ ও দাম", en: "Jobs & prices" },
  product: { bn: "পণ্য", en: "Products" },
  vehicle: { bn: "গাড়ি ও বাইক", en: "Vehicles" },
  stay: { bn: "রিসোর্ট ও হোটেল", en: "Resorts & hotels" },
}

/** Search hits grouped by kind. `soft` renders the "you might be looking for" strip shown when nothing matched. */
export function SearchResults({ locale, q, hits, soft = false }: { locale: Locale; q: string; hits: Hit[]; soft?: boolean }) {
  const bn = locale === "bn"
  const groups = ORDER.map((k) => [k, hits.filter((h) => h.kind === k)] as const).filter(([, xs]) => xs.length)
  if (!groups.length) return null
  return (
    <div className="space-y-5">
      {soft ? (
        <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Sparkles className="size-4 text-brand" aria-hidden /> {pick(locale, "হয়তো এগুলো খুঁজছেন", "You might be looking for")}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{pick(locale, `“${q}” এর জন্য ${hits.length}টি ফলাফল`, `${hits.length} results for “${q}”`)}</p>
      )}
      {groups.map(([kind, xs]) => (
        <section key={kind} aria-label={bn ? GROUP[kind].bn : GROUP[kind].en}>
          <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{bn ? GROUP[kind].bn : GROUP[kind].en}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {xs.map((h) => (
              <li key={`${h.kind}-${h.id}`}>
                <Link href={h.href} className="card card-lift group flex items-center gap-3 p-2.5">
                  {h.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.image} alt="" loading="lazy" className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-line" />
                  ) : (
                    <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden><Sparkles className="size-5" /></span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-extrabold text-ink">{hitTitle(h, locale)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {bn ? KIND_TEXT[h.kind].bn : KIND_TEXT[h.kind].en}
                      {hitSub(h, locale) ? ` · ${hitSub(h, locale)}` : ""}
                    </span>
                    {hitPrice(h, locale) ? <span className="mt-0.5 block text-sm font-extrabold text-brand">{hitPrice(h, locale)}</span> : null}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
