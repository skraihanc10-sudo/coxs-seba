"use client"

import { useState } from "react"
import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import type { Locale } from "@/lib/format"
import { taka } from "@/lib/format"
import { useCart } from "@/lib/cart"
import type { MarketVariant } from "./shop-market"

/** Variant picker + quantity + add-to-cart on a product page. */
export function ProductBuyBox({ locale, productId, variants }: { locale: Locale; productId: string; variants: MarketVariant[] }) {
  const bn = locale === "bn"
  const T = (b: string, e: string) => (bn ? b : e)
  const { add, count } = useCart()
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "")
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const v = variants.find((x) => x.id === variantId) ?? variants[0]
  const soldOut = !v || v.stock === 0
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-brand">{v ? taka(v.price, locale) : "—"}</span>
        {v && v.oldPrice > v.price ? <span className="text-sm font-semibold text-muted-foreground line-through">{taka(v.oldPrice, locale)}</span> : null}
        {v ? <span className="text-xs font-semibold text-muted-foreground">/ {v.label}</span> : null}
      </div>
      {variants.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={T("সাইজ / ওজন", "Size / weight")}>
          {variants.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={x.id === variantId} onClick={() => setVariantId(x.id)} className="chip" data-on={x.id === variantId}>{x.label} · {taka(x.price, locale)}</button>
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-canvas p-0.5">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-9 place-items-center rounded-full bg-white text-ink ring-1 ring-line" aria-label="−">−</button>
          <span className="w-8 text-center font-extrabold">{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} className="grid size-9 place-items-center rounded-full bg-white text-ink ring-1 ring-line" aria-label="+">+</button>
        </div>
        <button type="button" disabled={soldOut} onClick={() => { if (v) { add(v.id, productId, qty); setAdded(true); window.setTimeout(() => setAdded(false), 1500) } }} className={`h-11 flex-1 justify-center rounded-xl text-sm font-extrabold ${soldOut ? "bg-canvas text-muted-foreground" : added ? "bg-ok text-white" : "btn-primary"}`}>
          {soldOut ? T("স্টক নেই", "Sold out") : added ? T("✓ কার্টে যোগ হয়েছে", "✓ Added to cart") : T("কার্টে যোগ করুন", "Add to cart")}
        </button>
      </div>
      {count > 0 ? <Link href="/shop/checkout" className="btn-soft h-11 w-full justify-center text-sm font-extrabold ring-1 ring-brand/30"><ShoppingBag className="size-4" /> {T(`কার্ট দেখুন (${count})`, `View cart (${count})`)}</Link> : null}
    </div>
  )
}
