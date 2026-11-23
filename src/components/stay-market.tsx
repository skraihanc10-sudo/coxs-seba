"use client"

import { useState } from "react"
import Link from "next/link"
import { BedDouble, MapPin, Star } from "lucide-react"
import type { Locale } from "@/lib/format"
import { taka } from "@/lib/format"

export type MarketProperty = {
  id: string
  name: string
  kind: string
  kindText: string
  areaId: string
  area: string
  cover: string | null
  fromNight: number | null
  amenities: string[]
  rating: number | null
  roomCount: number
  /** Branch city when the property belongs to another branch than the one browsed. */
  city: string | null
  href: string
}

/**
 * The resort marketplace: every live property in one grid with kind chips and
 * an area filter. Each card opens the property page where rooms are booked.
 */
export function StayMarket({ locale, properties, fallback }: { locale: Locale; properties: MarketProperty[]; fallback: string | null }) {
  const bn = locale === "bn"
  const T = (b: string, e: string) => (bn ? b : e)
  const [kind, setKind] = useState("")
  const [areaId, setAreaId] = useState("")
  const kinds = Array.from(new Map(properties.map((p) => [p.kind, p.kindText])).entries())
  const areas = Array.from(new Map(properties.map((p) => [p.areaId, p.area])).entries())
  const list = properties.filter((p) => (!kind || p.kind === kind) && (!areaId || p.areaId === areaId))

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {kinds.length > 1 ? (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label={T("ধরন", "Kind")}>
            <button type="button" role="tab" aria-selected={!kind} onClick={() => setKind("")} className="chip shrink-0" data-on={!kind}>{T("সব", "All")}</button>
            {kinds.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className="chip shrink-0" data-on={kind === k}>{label}</button>
            ))}
          </div>
        ) : <span />}
        {areas.length > 1 ? (
          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            <MapPin className="size-4 text-brand" aria-hidden />
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="field h-10 w-auto min-w-40" aria-label={T("এলাকা", "Area")}>
              <option value="">{T("সব এলাকা", "All areas")}</option>
              {areas.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      {!list.length ? <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted-foreground">{T("এই ফিল্টারে কিছু নেই।", "Nothing matches this filter.")}</p> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <article key={p.id} className="card group flex flex-col overflow-hidden p-3">
            <Link href={p.href} className="relative block aspect-[16/10] w-full overflow-hidden rounded-2xl bg-canvas" aria-label={p.name}>
              {p.cover || fallback ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover ?? fallback ?? ""} alt={p.cover ? p.name : ""} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
              ) : null}
              <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">{p.kindText}</span>
              {p.fromNight ? <span className="absolute right-3 bottom-3 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-ink shadow">{T("রাতপ্রতি", "from")} {taka(p.fromNight, locale)}{T(" থেকে", "/night")}</span> : null}
            </Link>
            <div className="flex flex-1 flex-col gap-2 px-1 pt-4 pb-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-extrabold leading-tight text-ink"><Link href={p.href} className="hover:text-brand">{p.name}</Link></h3>
                {p.rating != null ? <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-amber-600"><Star className="size-3.5 fill-current" aria-hidden /> {p.rating.toFixed(1)}</span> : null}
              </div>
              <p className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"><MapPin className="size-3.5" aria-hidden /> {p.area}{p.city ? ` · ${p.city}` : ""}</p>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-bold text-ink">
                <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1"><BedDouble className="size-3" aria-hidden /> {T(`${p.roomCount} ধরনের রুম`, `${p.roomCount} room type${p.roomCount > 1 ? "s" : ""}`)}</span>
                {p.amenities.map((a) => <span key={a} className="rounded-full bg-canvas px-2.5 py-1">{a}</span>)}
              </div>
              <Link href={p.href} className="btn-soft mt-2 h-11 w-full justify-center text-sm font-extrabold ring-1 ring-brand/30">{T("রুম ও দাম দেখুন", "See rooms & prices")}</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
