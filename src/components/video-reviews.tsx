"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import type { Locale } from "@/lib/format"

/**
 * Customer video reviews from our YouTube channel: the chosen one plays
 * (muted autoplay, loops) and the rest sit as thumbnails. Admin pastes the
 * links in Settings → Reviews.
 */
export function VideoReviews({ ids, locale }: { ids: string[]; locale: Locale }) {
  const [current, setCurrent] = useState(ids[0])
  const bn = locale === "bn"
  if (!ids.length) return null
  return (
    <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
      <div className="relative aspect-video overflow-hidden rounded-3xl bg-navy shadow-[0_18px_50px_rgba(7,26,58,0.25)] ring-1 ring-line">
        <iframe
          key={current}
          src={`https://www.youtube-nocookie.com/embed/${current}?autoplay=1&mute=1&loop=1&playlist=${current}&rel=0&modestbranding=1&playsinline=1`}
          title={bn ? "কাস্টমারের ভিডিও রিভিউ" : "Customer video review"}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 h-full w-full"
        />
      </div>
      {ids.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-2 lg:content-start lg:overflow-visible" aria-label={bn ? "আরও ভিডিও" : "More videos"}>
          {ids.map((id, i) => (
            <li key={id} className="shrink-0">
              <button type="button" onClick={() => setCurrent(id)} className={`relative block w-40 overflow-hidden rounded-2xl ring-2 transition lg:w-full ${id === current ? "ring-brand" : "ring-transparent hover:ring-brand/40"}`} aria-label={bn ? `ভিডিও ${i + 1}` : `Video ${i + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                <span className="absolute inset-0 grid place-items-center bg-black/25"><span className="grid size-9 place-items-center rounded-full bg-white/90 text-brand"><Play className="size-4 fill-current" aria-hidden /></span></span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
