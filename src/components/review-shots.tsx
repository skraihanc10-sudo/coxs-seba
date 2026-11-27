"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { PhotoLightbox } from "./photo-gallery"

const INTERVAL = 3500

/**
 * Screenshots of reviews from our Facebook page and YouTube comments, all in
 * one card size, sliding across on their own. Tap one to see it full size.
 */
export function ReviewShots({ photos, label }: { photos: string[]; label: string }) {
  const strip = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const [open, setOpen] = useState<number | null>(null)

  const step = (dir: 1 | -1) => {
    const el = strip.current
    if (!el) return
    const card = el.firstElementChild as HTMLElement | null
    const w = (card?.offsetWidth ?? 240) + 12
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" })
    else el.scrollBy({ left: dir * w, behavior: "smooth" })
  }

  useEffect(() => {
    if (paused || photos.length < 2 || open !== null) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = window.setInterval(() => step(1), INTERVAL)
    return () => window.clearInterval(t)
  }, [paused, photos.length, open])

  if (!photos.length) return null
  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
      <div ref={strip} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none]" aria-label={label}>
        {photos.map((src, i) => (
          <button key={src + i} type="button" onClick={() => setOpen(i)} className="card card-lift aspect-[4/5] w-[68%] shrink-0 snap-start overflow-hidden bg-canvas sm:w-[44%] lg:w-[23.5%]" aria-label={`${label} ${i + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
          </button>
        ))}
      </div>
      {photos.length > 1 ? (
        <>
          <button type="button" onClick={() => step(-1)} aria-label="Previous" className="absolute top-1/2 -left-2 hidden -translate-y-1/2 rounded-full bg-white p-2 text-ink shadow ring-1 ring-line md:block"><ChevronLeft className="size-5" /></button>
          <button type="button" onClick={() => step(1)} aria-label="Next" className="absolute top-1/2 -right-2 hidden -translate-y-1/2 rounded-full bg-white p-2 text-ink shadow ring-1 ring-line md:block"><ChevronRight className="size-5" /></button>
        </>
      ) : null}
      {open !== null ? <PhotoLightbox photos={photos} start={open} alt={label} onClose={() => setOpen(null)} /> : null}
    </div>
  )
}
