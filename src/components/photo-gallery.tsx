"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react"

/**
 * Photos of one listing: a big cover, every thumbnail selectable, and a
 * full-screen zoom with previous/next. Tap the cover (or a thumb twice) to zoom.
 */
export function PhotoGallery({ photos, alt, aspect = "aspect-[16/10]", badge, corner }: { photos: string[]; alt: string; aspect?: string; badge?: React.ReactNode; corner?: React.ReactNode }) {
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(false)
  const n = photos.length
  const prev = () => setI((x) => (x - 1 + n) % n)
  const next = () => setI((x) => (x + 1) % n)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, n])

  if (!n) return null
  const src = photos[Math.min(i, n - 1)]

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl bg-canvas">
        <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in" aria-label="Zoom photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className={`${aspect} w-full object-cover`} />
        </button>
        {badge ? <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">{badge}</span> : null}
        {corner ? <span className="absolute top-3 right-3">{corner}</span> : null}
        <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white"><ZoomIn className="size-3.5" aria-hidden /> {n > 1 ? `${i + 1}/${n}` : ""}</span>
        {n > 1 ? (
          <>
            <button type="button" onClick={prev} aria-label="Previous" className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-ink shadow hover:bg-white"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={next} aria-label="Next" className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-ink shadow hover:bg-white"><ChevronRight className="size-5" /></button>
          </>
        ) : null}
      </div>
      {n > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, k) => (
            <button key={p + k} type="button" onClick={() => (k === i ? setOpen(true) : setI(k))} className={`shrink-0 overflow-hidden rounded-xl ring-2 transition ${k === i ? "ring-brand" : "ring-transparent opacity-80 hover:opacity-100"}`} aria-label={`Photo ${k + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="aspect-[4/3] w-20 object-cover sm:w-24" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-bold">{n > 1 ? `${i + 1} / ${n}` : ""}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="size-5" /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="max-h-full max-w-full rounded-xl object-contain" />
            {n > 1 ? (
              <>
                <button type="button" onClick={prev} aria-label="Previous" className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/30"><ChevronLeft className="size-6" /></button>
                <button type="button" onClick={next} aria-label="Next" className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/30"><ChevronRight className="size-6" /></button>
              </>
            ) : null}
          </div>
          {n > 1 ? (
            <div className="flex gap-2 overflow-x-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
              {photos.map((p, k) => (
                <button key={p + k} type="button" onClick={() => setI(k)} className={`shrink-0 overflow-hidden rounded-lg ring-2 ${k === i ? "ring-white" : "ring-transparent opacity-60"}`} aria-label={`Photo ${k + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" className="aspect-[4/3] w-16 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
