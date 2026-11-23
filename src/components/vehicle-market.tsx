"use client"

import { useState } from "react"
import Link from "next/link"
import { MapPin, Star, Users } from "lucide-react"
import type { Locale } from "@/lib/format"
import { taka } from "@/lib/format"

export type MarketVehicle = {
  id: string
  name: string
  typeId: string
  type: string
  cover: string | null
  seats: number
  detail: string
  specs: string[]
  pricePerHour: number
  pricePerDay: number
  pricePerHalfDay: number
  minHours: number
  owner: string | null
  rating: number | null
  /** Branch city when the vehicle belongs to a branch other than the one being browsed. */
  city: string | null
  href: string
  /** Vehicle detail page (gallery, specs, route packages). */
  detailHref: string
  routeCount: number
  /** Cheapest route package, for vehicles sold by route only. */
  fromRoute: number
}

export type MarketType = { id: string; name: string }

/**
 * The rent-a-car marketplace: every bike, car and jeep together in one grid,
 * with type chips to narrow it down. Clicking "Book" opens the wizard with
 * that exact vehicle picked.
 */
export function VehicleMarket({ locale, vehicles, types, fallback }: { locale: Locale; vehicles: MarketVehicle[]; types: MarketType[]; fallback: string | null }) {
  const bn = locale === "bn"
  const T = (b: string, e: string) => (bn ? b : e)
  const [typeId, setTypeId] = useState("")
  const used = types.filter((t) => vehicles.some((v) => v.typeId === t.id))
  const list = typeId ? vehicles.filter((v) => v.typeId === typeId) : vehicles

  return (
    <div>
      {used.length > 1 ? (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label={T("গাড়ির ধরন", "Vehicle type")}>
          <button type="button" role="tab" aria-selected={!typeId} onClick={() => setTypeId("")} className="chip shrink-0" data-on={!typeId}>{T("সব", "All")}</button>
          {used.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={typeId === t.id} onClick={() => setTypeId(t.id)} className="chip shrink-0" data-on={typeId === t.id}>{t.name}</button>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((v) => (
          <article key={v.id} className="card flex flex-col overflow-hidden p-3">
            <Link href={v.detailHref} className="relative block aspect-[16/10] w-full overflow-hidden rounded-2xl bg-canvas" aria-label={v.name}>
              {v.cover || fallback ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.cover ?? fallback ?? ""} alt={v.cover ? v.name : ""} className="h-full w-full object-cover transition duration-500 hover:scale-105" loading="lazy" />
              ) : null}
              <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">{v.type}</span>
              {v.city ? <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink"><MapPin className="size-3" aria-hidden /> {v.city}</span> : null}
            </Link>
            <div className="flex flex-1 flex-col gap-2 px-1 pt-4 pb-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-extrabold leading-tight text-ink"><Link href={v.detailHref} className="hover:text-brand">{v.name}</Link></h3>
                {v.rating != null ? <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-amber-600"><Star className="size-3.5 fill-current" aria-hidden /> {v.rating.toFixed(1)}</span> : null}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {v.pricePerDay ? (
                  <span className="text-2xl font-extrabold text-brand">{taka(v.pricePerDay, locale)}<span className="ml-1 text-xs font-semibold text-muted-foreground">/{T("দিন", "day")}</span></span>
                ) : v.pricePerHour ? (
                  <span className="text-2xl font-extrabold text-brand">{taka(v.pricePerHour, locale)}<span className="ml-1 text-xs font-semibold text-muted-foreground">/{T("ঘণ্টা", "hr")}</span></span>
                ) : v.pricePerHalfDay ? (
                  <span className="text-2xl font-extrabold text-brand">{taka(v.pricePerHalfDay, locale)}<span className="ml-1 text-xs font-semibold text-muted-foreground">/{T("হাফ-ডে", "half-day")}</span></span>
                ) : (
                  <span className="text-2xl font-extrabold text-brand"><span className="mr-1 text-xs font-semibold text-muted-foreground">{T("রুট", "routes from")}</span>{taka(v.fromRoute, locale)}<span className="ml-1 text-xs font-semibold text-muted-foreground">{T("থেকে", "")}</span></span>
                )}
                {v.pricePerDay && v.pricePerHour ? <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-ink">{taka(v.pricePerHour, locale)} <span className="font-semibold text-muted-foreground">/{T("ঘণ্টা", "hr")}</span></span> : null}
              </div>
              <p className="-mt-1 text-xs font-semibold text-muted-foreground">
                {v.pricePerHalfDay && (v.pricePerDay || v.pricePerHour) ? <>{taka(v.pricePerHalfDay, locale)} /{T("হাফ-ডে (৬ ঘণ্টা)", "half-day (6 hrs)")}</> : null}
                {v.pricePerHalfDay && (v.pricePerDay || v.pricePerHour) && v.pricePerHour ? " · " : null}
                {v.pricePerHour ? T(`কমপক্ষে ${v.minHours} ঘণ্টা`, `min ${v.minHours} hrs`) : null}
              </p>
              {v.detail ? <p className="text-sm text-muted-foreground">{v.detail}</p> : null}
              <div className="flex flex-wrap gap-1.5 text-[11px] font-bold text-ink">
                <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1"><Users className="size-3" aria-hidden /> {T(`${v.seats} সিট`, `${v.seats} seats`)}</span>
                {v.specs.map((s) => <span key={s} className="rounded-full bg-canvas px-2.5 py-1">{s}</span>)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {v.owner ? T(`পার্টনার: ${v.owner}`, `Partner: ${v.owner}`) : T("HANDYO-র নিজের গাড়ি", "HANDYO fleet")}
                {v.routeCount ? <> · <Link href={v.detailHref} className="font-bold text-brand">{T(`${v.routeCount}টা রুট প্যাকেজ →`, `${v.routeCount} route package${v.routeCount > 1 ? "s" : ""} →`)}</Link></> : null}
              </p>
              <Link href={v.routeCount && !v.pricePerHour && !v.pricePerDay && !v.pricePerHalfDay ? v.detailHref : v.href} className="btn-soft mt-2 h-11 w-full justify-center text-sm font-extrabold ring-1 ring-brand/30">{T(`${v.name} বুক করুন`, `Book ${v.name}`)}</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
