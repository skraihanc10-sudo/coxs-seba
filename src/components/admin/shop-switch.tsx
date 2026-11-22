"use client"

import { useRef } from "react"
import { usePathname } from "next/navigation"
import { Store } from "lucide-react"
import { setOfficeShopAction } from "@/actions/admin"
import type { Locale } from "@/lib/format"

type ShopOption = { id: string; name: string; nameBn: string; active: boolean }

/**
 * Owner-only: pick which shop the office panels show. A plain form posting
 * `setOfficeShopAction`, auto-submitted when the select changes.
 */
export function ShopSwitch({ shops, current, locale }: { shops: ShopOption[]; current: string; locale: Locale }) {
  const path = usePathname()
  const ref = useRef<HTMLFormElement>(null)
  const bn = locale === "bn"
  return (
    <form ref={ref} action={setOfficeShopAction} className="flex items-center gap-2">
      <input type="hidden" name="back" value={path} />
      <label className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground" htmlFor="office-shop">
        <Store className="size-4" /> {bn ? "শপ" : "Shop"}
      </label>
      <select id="office-shop" name="shopId" defaultValue={current} className="field h-9 max-w-60 text-sm" onChange={() => ref.current?.requestSubmit()} aria-label={bn ? "যে শপে কাজ করছেন" : "Shop you are working in"}>
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {bn ? s.nameBn : s.name}
            {!s.active ? (bn ? " (বন্ধ)" : " (off)") : ""}
          </option>
        ))}
      </select>
      <noscript>
        <button className="btn-soft h-9 px-3 text-xs">{bn ? "বদলান" : "Switch"}</button>
      </noscript>
    </form>
  )
}
