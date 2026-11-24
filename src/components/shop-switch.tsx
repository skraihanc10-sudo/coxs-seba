"use client"

import { useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronDown, MapPin } from "lucide-react"
import { setShopAction } from "@/actions/auth"
import type { Locale } from "@/lib/format"

export type ShopOption = { slug: string; name: string; nameBn: string; city: string; cityBn: string }

/**
 * Branch / city picker in the site header. A native <select> drawn as a pill,
 * so it works the same on phones; picking a shop submits `setShopAction`
 * and comes back to the page the visitor was on.
 */
export function ShopSwitch({ shops, current, locale, light = false }: { shops: ShopOption[]; current: string; locale: Locale; light?: boolean }) {
  const path = usePathname()
  const query = useSearchParams().toString()
  const back = query ? `${path}?${query}` : path
  const form = useRef<HTMLFormElement>(null)
  if (shops.length < 2) return null
  const bn = locale === "bn"
  const active = shops.find((s) => s.slug === current) ?? shops[0]
  const label = bn ? active.cityBn : active.city
  const tone = light ? "bg-white/15 text-white ring-white/20" : "bg-brand-soft text-brand ring-transparent"
  return (
    <form ref={form} action={setShopAction} className={`relative inline-flex h-9 max-w-[7.5rem] items-center gap-1.5 rounded-full px-2.5 sm:max-w-[11rem] sm:px-3 text-xs font-extrabold ring-1 ${tone}`} aria-label={bn ? "শাখা বদলান" : "Change branch"}>
      <input type="hidden" name="back" value={back} />
      <MapPin className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
      <ChevronDown className="size-3.5 shrink-0" aria-hidden />
      <select
        key={active.slug}
        name="shop"
        defaultValue={active.slug}
        onChange={() => form.current?.requestSubmit()}
        aria-label={bn ? "আপনার শহর বেছে নিন" : "Choose your city"}
        className="absolute inset-0 w-full cursor-pointer appearance-none opacity-0"
      >
        {shops.map((s) => (
          <option key={s.slug} value={s.slug}>
            {bn ? s.cityBn : s.city} · {bn ? s.nameBn : s.name}
          </option>
        ))}
      </select>
      <noscript>
        <button className="ml-1 underline">{bn ? "যান" : "Go"}</button>
      </noscript>
    </form>
  )
}
