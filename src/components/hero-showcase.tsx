"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Locale } from "@/lib/format"

export type ShowcaseItem = {
  slug: string
  name: string
  nameBn: string
  image: string
  /** "৳250/job" style line, already localised; null means "quote after visit". */
  priceLine: string | null
  blurb: string
}

const INTERVAL = 3800

/**
 * The rotating "featured services" board on the right of the hero: one big
 * illustrated card per category, auto-advancing like a sponsor board. Clicking
 * a card opens that category. Pauses on hover/focus and honours reduced motion.
 */
export function HeroShowcase({ items, locale }: { items: ShowcaseItem[]; locale: Locale }) {
  const bn = locale === "bn"
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reduced.current = mq.matches
    const onChange = () => { reduced.current = mq.matches }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (paused || items.length < 2 || reduced.current) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), INTERVAL)
    return () => window.clearInterval(id)
  }, [paused, items.length])

  if (!items.length) return null
  const go = (n: number) => setIndex(((n % items.length) + items.length) % items.length)

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={bn ? "ফিচার্ড সেবা" : "Featured services"}
    >
      <div className="showcase-fade relative aspect-[5/3] overflow-hidden rounded-2xl bg-white/10 shadow-none ring-0 lg:shadow-2xl lg:ring-1 lg:ring-white/20">
        <div className="flex h-full transition-transform duration-700 ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
          {items.map((c, i) => (
            <Link
              key={c.slug}
              href={`/services/${c.slug}`}
              className="relative h-full w-full shrink-0 outline-none"
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
              aria-label={`${bn ? c.nameBn : c.name}${c.priceLine ? ` · ${c.priceLine}` : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading={i === 0 ? "eager" : "lazy"} draggable={false} />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-4 pt-10 pb-3 text-white">
                <span className="block text-[11px] font-bold tracking-wide text-white/75 uppercase">{bn ? "ফিচার্ড সেবা" : "Featured service"}</span>
                <span className="block text-lg font-extrabold leading-tight">{bn ? c.nameBn : c.name}</span>
                <span className="block text-xs text-white/85">{c.priceLine ?? (bn ? "দেখে দাম জানাই" : "Quote after a visit")} · {bn ? "বুক করুন →" : "Book now →"}</span>
              </span>
            </Link>
          ))}
        </div>
        {items.length > 1 ? (
          <>
            <button type="button" onClick={() => go(index - 1)} aria-label={bn ? "আগেরটা" : "Previous"} className="absolute top-1/2 left-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => go(index + 1)} aria-label={bn ? "পরেরটা" : "Next"} className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"><ChevronRight className="size-5" /></button>
          </>
        ) : null}
      </div>
      {items.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label={bn ? "স্লাইড" : "Slides"}>
          {items.map((c, i) => (
            <button
              key={c.slug}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={bn ? c.nameBn : c.name}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
