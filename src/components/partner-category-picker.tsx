"use client"

import { useState } from "react"
import { Store } from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"

type Opt = { id: string; label: string; icon: string }

/**
 * "What will you offer": ship tickets, vehicles, resorts, or a shop. A shop
 * then asks what it sells (dried fish, pickles, laundry...), because that is
 * the category the office approves. The form only ever sends `categoryId`.
 */
export function PartnerCategoryPicker({ direct, shop, labels }: { direct: Opt[]; shop: Opt[]; labels: { group: string; shopTile: string; shopKind: string } }) {
  const [kind, setKind] = useState(direct[0]?.id ?? "shop")
  const [shopKind, setShopKind] = useState(shop[0]?.id ?? "")
  const categoryId = kind === "shop" ? shopKind : kind
  const tile = (on: boolean) => `card flex cursor-pointer flex-col items-center gap-1.5 px-2 py-3 text-center text-xs font-extrabold transition hover:ring-brand/40 ${on ? "bg-brand text-white ring-brand" : "text-ink"}`
  return (
    <div className="space-y-3">
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={labels.group}>
        {direct.map((c) => (
          <label key={c.id} className={tile(kind === c.id)}>
            <input type="radio" name="kind" value={c.id} checked={kind === c.id} onChange={() => setKind(c.id)} className="sr-only" />
            <CategoryIcon name={c.icon} className="size-6" />
            {c.label}
          </label>
        ))}
        {shop.length ? (
          <label className={tile(kind === "shop")}>
            <input type="radio" name="kind" value="shop" checked={kind === "shop"} onChange={() => setKind("shop")} className="sr-only" />
            <Store className="size-6" aria-hidden />
            {labels.shopTile}
          </label>
        ) : null}
      </div>
      {kind === "shop" && shop.length ? (
        <div>
          <label className="label" htmlFor="shopKind">{labels.shopKind}</label>
          <select id="shopKind" value={shopKind} onChange={(e) => setShopKind(e.target.value)} className="field">
            {shop.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      ) : null}
    </div>
  )
}
