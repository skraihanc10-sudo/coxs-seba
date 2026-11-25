"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import type { Locale } from "@/lib/format"
import type { Hit } from "@/lib/search-shared"
import { hitPrice, hitSub, hitTitle, KIND_TEXT } from "@/lib/search-shared"

type Props = {
  locale: Locale
  /** Pre-filled text (the services page). */
  initial?: string
  /** "hero" is the white box on the blue banner; "plain" is the paper box on inner pages. */
  variant?: "hero" | "plain"
  buttonText: string
}

/**
 * Search box with live suggestions. Typing calls /api/search, which forgives
 * Bangla / English / Banglish misspellings; when nothing matches it still
 * offers a few of our own items so nobody lands on a dead end.
 */
export function SearchBox({ locale, initial = "", variant = "plain", buttonText }: Props) {
  const bn = locale === "bn"
  const router = useRouter()
  const listId = useId()
  const [q, setQ] = useState(initial)
  const [hits, setHits] = useState<Hit[]>([])
  const [suggested, setSuggested] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const box = useRef<HTMLDivElement>(null)
  const seq = useRef(0)

  useEffect(() => {
    const text = q.trim()
    const id = ++seq.current
    if (text.length < 2) return
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(text)}`)
        const data = (await res.json()) as { hits: Hit[]; suggested: boolean }
        if (id !== seq.current) return
        setHits(data.hits)
        setSuggested(data.suggested)
        setActive(-1)
      } catch {
        /* network hiccup: keep the last list */
      }
    }, 180)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const show = open && q.trim().length >= 2 && hits.length > 0
  const go = (h: Hit) => {
    setOpen(false)
    router.push(h.href)
  }
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!show) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => (a + 1) % hits.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => (a <= 0 ? hits.length - 1 : a - 1))
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault()
      go(hits[active])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const hero = variant === "hero"
  return (
    <div ref={box} className="relative max-w-xl">
      <form
        action="/services"
        role="search"
        className={
          hero
            ? "flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.25)] ring-4 ring-white/10"
            : "flex items-center gap-2 rounded-2xl bg-paper p-1.5 ring-1 ring-line"
        }
        onSubmit={() => setOpen(false)}
      >
        <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          autoComplete="off"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={bn ? "সেবা খুঁজুন" : "Search services"}
          placeholder={bn ? "কী লাগবে? যেমন: চান্দের গাড়ি, রিসোর্ট, শুঁটকি, এসি" : "What do you need? e.g. chander gari, resort, dried fish, AC"}
          className={`h-11 min-w-0 flex-1 bg-transparent outline-none ${hero ? "text-ink placeholder:text-muted-foreground" : ""}`}
        />
        <button className={`${hero ? "btn-primary" : "btn-soft"} h-11 px-4 text-sm`}>{buttonText}</button>
      </form>
      {show ? (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-40 mt-2 max-h-[22rem] overflow-auto rounded-2xl bg-white p-1.5 text-ink shadow-[0_18px_40px_rgba(0,0,0,0.2)] ring-1 ring-line">
          {suggested ? (
            <li className="px-3 pt-1.5 pb-1 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
              {bn ? "ঠিক এমন কিছু পাইনি · আমাদের কাছে আছে" : "No exact match · we do have"}
            </li>
          ) : null}
          {hits.map((h, i) => (
            <li key={`${h.kind}-${h.id}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h)}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${i === active ? "bg-brand-soft" : "hover:bg-canvas"}`}
              >
                {h.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.image} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-line" />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand" aria-hidden><Search className="size-4" /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">{hitTitle(h, locale)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {bn ? KIND_TEXT[h.kind].bn : KIND_TEXT[h.kind].en}
                    {hitSub(h, locale) ? ` · ${hitSub(h, locale)}` : ""}
                  </span>
                </span>
                {hitPrice(h, locale) ? <span className="shrink-0 text-xs font-extrabold text-brand">{hitPrice(h, locale)}</span> : null}
              </button>
            </li>
          ))}
          <li className="px-3 pt-1 pb-1.5">
            <button type="button" onClick={() => router.push(`/services?q=${encodeURIComponent(q.trim())}`)} className="text-xs font-bold text-brand hover:underline">
              {bn ? `“${q.trim()}” এর সব ফলাফল দেখুন` : `See all results for “${q.trim()}”`}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}
