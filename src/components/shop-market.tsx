"use client"

import { useState } from "react"
import Link from "next/link"
import { ShoppingBag, Store, Truck } from "lucide-react"
import type { Locale } from "@/lib/format"
import { taka } from "@/lib/format"
import { useCart } from "@/lib/cart"

export type MarketVariant = { id: string; label: string; price: number; oldPrice: number; stock: number }
export type MarketProduct = { id: string; slug: string; groupId: string; storeId: string | null; storeName: string; name: string; cover: string | null; badge: string; variants: MarketVariant[] }
export type MarketStore = { id: string; slug: string; name: string; cover: string | null }
export type ShopRules = { delivery: number; freeAbove: number; minOrder: number }

/**
 * The storefront of one shop category: a row of partner stores on top (pick
 * one to see only its items), shelf chips, product cards with a variant picker
 * and add-to-cart, and a sticky cart bar leading to checkout. Prices here are
 * for display; checkout re-prices everything on the server.
 */
export function ShopMarket({ locale, groups, stores, products, rules, partnerHref, mode = "shop" }: { locale: Locale; groups: Array<{ id: string; name: string }>; stores: MarketStore[]; products: MarketProduct[]; rules: ShopRules; partnerHref: string; mode?: "shop" | "laundry" }) {
  const bn = locale === "bn"
  const laundry = mode === "laundry"
  const T = (b: string, e: string) => (bn ? b : e)
  const [groupId, setGroupId] = useState("")
  const [storeId, setStoreId] = useState("")
  const { cart, add, setQty, count } = useCart()
  const byStore = storeId ? products.filter((p) => p.storeId === storeId) : products
  const used = groups.filter((g) => byStore.some((p) => p.groupId === g.id))
  const list = groupId && used.some((g) => g.id === groupId) ? byStore.filter((p) => p.groupId === groupId) : byStore
  const priceOf = new Map(products.flatMap((p) => p.variants.map((v) => [v.id, v.price] as const)))
  const subtotal = cart.reduce((n, c) => n + (priceOf.get(c.variantId) ?? 0) * c.qty, 0)
  const current = stores.find((s) => s.id === storeId)

  return (
    <div className="pb-20">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        <Truck className="size-4" aria-hidden />
        {laundry ? (
          <span>{T(`কাপড় বেছে প্রতিটার সার্ভিস দিন (ওয়াশ ও আয়রন / শুধু আয়রন / ড্রাই ক্লিন) · রাইডার পিকআপ ও ফেরত ${rules.delivery ? taka(rules.delivery, locale) : "ফ্রি"}${rules.freeAbove && rules.delivery ? ` (${taka(rules.freeAbove, locale)}-এর ওপরে ফ্রি)` : ""}${rules.minOrder ? ` · ন্যূনতম অর্ডার ${taka(rules.minOrder, locale)}` : ""} · কাপড় ফেরত পেয়ে টাকা দিন`, `Pick garments and a service for each (wash & iron / iron only / dry clean) · rider pickup & return ${rules.delivery ? taka(rules.delivery, locale) : "free"}${rules.freeAbove && rules.delivery ? ` (free above ${taka(rules.freeAbove, locale)})` : ""}${rules.minOrder ? ` · minimum order ${taka(rules.minOrder, locale)}` : ""} · pay when your clothes come back`)}</span>
        ) : (
        <span>{T(`সরাসরি কক্সবাজার থেকে সারা দেশে কুরিয়ার · ডেলিভারি চার্জ ${taka(rules.delivery, locale)} প্রতি পার্সেল${rules.freeAbove ? ` (${taka(rules.freeAbove, locale)}-এর ওপরে ফ্রি)` : ""} · ন্যূনতম অর্ডার ${taka(rules.minOrder, locale)} · পণ্য হাতে পেয়ে টাকা দিন`, `Courier from Cox's Bazar to anywhere in Bangladesh · delivery ${taka(rules.delivery, locale)} per parcel${rules.freeAbove ? ` (free above ${taka(rules.freeAbove, locale)})` : ""} · minimum order ${taka(rules.minOrder, locale)} · pay on delivery`)}</span>
        )}
      </div>

      {stores.length > 1 ? (
        <section className="mb-4">
          <p className="mb-2 text-xs font-extrabold text-muted-foreground uppercase">{T(laundry ? "লন্ড্রি বেছে নিন" : "দোকান বেছে নিন", laundry ? "Pick a laundry" : "Pick a store")}</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label={T("দোকান", "Stores")}>
            <button type="button" role="tab" aria-selected={!storeId} onClick={() => { setStoreId(""); setGroupId("") }} className="chip shrink-0" data-on={!storeId}><Store className="mr-1 size-3.5" aria-hidden /> {T("সব দোকান", "All stores")}</button>
            {stores.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={storeId === s.id} onClick={() => { setStoreId(s.id); setGroupId("") }} className="chip shrink-0" data-on={storeId === s.id}>
                {s.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.cover} alt="" className="mr-1.5 size-5 rounded-full object-cover" />
                ) : null}
                {s.name}
              </button>
            ))}
          </div>
          {current ? <p className="mt-2 text-sm text-muted-foreground">{T(`${current.name}-এর সব পণ্য দেখছেন। এক দোকানের সব পণ্য এক পার্সেলে আসে।`, `Showing everything from ${current.name}. Items from one store ship as one parcel.`)}</p> : null}
        </section>
      ) : null}

      {used.length > 1 ? (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label={T("পণ্যের ধরন", "Product group")}>
          <button type="button" role="tab" aria-selected={!groupId} onClick={() => setGroupId("")} className="chip shrink-0" data-on={!groupId}>{T("সব", "All")}</button>
          {used.map((g) => (
            <button key={g.id} type="button" role="tab" aria-selected={groupId === g.id} onClick={() => setGroupId(g.id)} className="chip shrink-0" data-on={groupId === g.id}>{g.name}</button>
          ))}
        </div>
      ) : null}
      {!list.length ? <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted-foreground">{T("এখনো কোনো পণ্য নেই।", "No products yet.")}</p> : null}
      {laundry ? (
        <div className="card divide-y divide-line overflow-hidden">
          {list.map((p) => <LaundryLine key={p.id} p={p} locale={locale} inCart={(id) => cart.find((c) => c.variantId === id)?.qty ?? 0} onAdd={(v) => add(v.id, p.id, 1)} onQty={(v, q) => setQty(v.id, q)} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => <ProductCard key={p.id} p={p} locale={locale} laundry={laundry} onAdd={(v) => add(v.id, p.id, 1)} onStore={() => { setStoreId(p.storeId ?? ""); setGroupId("") }} />)}
        </div>
      )}

      {laundry ? null : (
        <Link href={partnerHref} className="card mt-6 flex items-center justify-between gap-3 bg-brand-soft p-4 transition hover:ring-brand/40">
          <div>
            <p className="font-extrabold text-ink">{T("আপনার শুঁটকি বা আচারের দোকান HANDYO-তে আনুন", "Bring your dried-fish or pickle store to HANDYO")}</p>
            <p className="text-sm text-muted-foreground">{T("নিজের দোকানের নামে পণ্য দিন, সারা দেশের অর্ডার পান; সাইন-আপ ফ্রি।", "List under your own store name, get orders nationwide; free to sign up.")}</p>
          </div>
          <span className="shrink-0 font-extrabold text-brand">{T("দোকান খুলুন →", "Open a store →")}</span>
        </Link>
      )}

      {count > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-40 border-t border-line bg-paper/95 px-4 py-2.5 shadow-[0_-8px_24px_rgba(7,26,58,0.08)] backdrop-blur md:bottom-0 md:pt-3 md:pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">{T(`কার্টে ${count}টা পণ্য`, `${count} item${count > 1 ? "s" : ""} in cart`)}</p>
              <p className="text-lg font-extrabold text-ink">{taka(subtotal, locale)}{subtotal < rules.minOrder ? <span className="ml-2 text-xs font-semibold text-amber-700">{T(`ন্যূনতম ${taka(rules.minOrder, locale)}`, `min ${taka(rules.minOrder, locale)}`)}</span> : null}</p>
            </div>
            <Link href="/shop/checkout" className="btn-primary h-11 px-5 md:h-12 md:px-6"><ShoppingBag className="size-4" /> {T("অর্ডার করুন", "Checkout")}</Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** One laundry item per line: small photo, name, service picker, price, add button. */
function LaundryLine({ p, locale, inCart, onAdd, onQty }: { p: MarketProduct; locale: Locale; inCart: (variantId: string) => number; onAdd: (v: MarketVariant) => void; onQty: (v: MarketVariant, qty: number) => void }) {
  const bn = locale === "bn"
  const T = (b: string, e: string) => (bn ? b : e)
  const [variantId, setVariantId] = useState(p.variants[0]?.id ?? "")
  const v = p.variants.find((x) => x.id === variantId) ?? p.variants[0]
  const soldOut = !v || v.stock === 0
  const qty = v ? inCart(v.id) : 0
  return (
    <div className="grid grid-cols-[52px_1fr_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 sm:grid-cols-[56px_1fr_12rem_5rem_auto] sm:px-4">
      <span className="row-span-2 block size-13 overflow-hidden rounded-xl bg-canvas ring-1 ring-line sm:row-span-1 sm:size-14">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.cover ? <img src={p.cover} alt={p.name} className="h-full w-full object-cover" loading="lazy" /> : null}
      </span>
      <p className="min-w-0 truncate text-[15px] font-extrabold text-ink">{p.name}{p.badge ? <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">{p.badge}</span> : null}</p>
      <p className="text-right text-base font-extrabold text-brand sm:order-4">{v ? taka(v.price, locale) : "—"}</p>
      {p.variants.length > 1 ? (
        <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className="field col-start-2 h-9 text-xs sm:order-3 sm:col-start-auto" aria-label={T("সার্ভিস", "Service")}>
          {p.variants.map((x) => <option key={x.id} value={x.id}>{x.label} · {taka(x.price, locale)}</option>)}
        </select>
      ) : <p className="col-start-2 text-xs font-semibold text-muted-foreground sm:order-3 sm:col-start-auto">{v?.label}</p>}
      {qty > 0 && v ? (
        <div className="col-start-3 inline-flex h-9 items-center overflow-hidden rounded-xl bg-brand text-white sm:order-5 sm:col-start-auto" aria-label={T("পরিমাণ", "Quantity")}>
          <button type="button" onClick={() => onQty(v, qty - 1)} className="h-9 w-9 text-lg font-extrabold hover:bg-white/15" aria-label={T("একটা কমান", "Remove one")}>−</button>
          <span className="min-w-7 text-center text-sm font-extrabold tabular-nums">{qty}</span>
          <button type="button" onClick={() => onQty(v, qty + 1)} className="h-9 w-9 text-lg font-extrabold hover:bg-white/15" aria-label={T("একটা বাড়ান", "Add one")}>+</button>
        </div>
      ) : (
        <button
          type="button"
          disabled={soldOut}
          onClick={() => { if (v) onAdd(v) }}
          className={`col-start-3 h-9 justify-center rounded-xl px-3 text-xs font-extrabold transition sm:order-5 sm:col-start-auto ${soldOut ? "bg-canvas text-muted-foreground" : "btn-soft ring-1 ring-brand/30"}`}
        >
          {soldOut ? T("নেই", "Out") : T("+ কার্টে", "+ Add")}
        </button>
      )}
    </div>
  )
}

function ProductCard({ p, locale, onAdd, onStore, laundry = false }: { p: MarketProduct; locale: Locale; onAdd: (v: MarketVariant) => void; onStore: () => void; laundry?: boolean }) {
  const bn = locale === "bn"
  const T = (b: string, e: string) => (bn ? b : e)
  const [variantId, setVariantId] = useState(p.variants[0]?.id ?? "")
  const [added, setAdded] = useState(false)
  const v = p.variants.find((x) => x.id === variantId) ?? p.variants[0]
  const off = v && v.oldPrice > v.price ? Math.round(((v.oldPrice - v.price) / v.oldPrice) * 100) : 0
  const soldOut = !v || v.stock === 0
  return (
    <article className="card card-lift flex flex-col overflow-hidden p-2.5">
      <Link href={`/shop/${p.slug}`} className="relative block aspect-square w-full overflow-hidden rounded-xl bg-canvas" aria-label={p.name}>
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt={p.name} className="h-full w-full object-cover transition duration-500 hover:scale-105" loading="lazy" />
        ) : null}
        {p.badge ? <span className="absolute top-2 left-2 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">{p.badge}</span> : null}
        {off ? <span className="absolute top-2 right-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">−{off}%</span> : null}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 px-0.5 pt-2.5">
        {p.storeName ? <button type="button" onClick={onStore} className="inline-flex items-center gap-1 self-start text-[11px] font-bold text-brand hover:underline"><Store className="size-3" aria-hidden /> {p.storeName}</button> : null}
        <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug text-ink"><Link href={`/shop/${p.slug}`} className="hover:text-brand">{p.name}</Link></h3>
        {p.variants.length > 1 ? (
          <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className="field h-9 text-xs" aria-label={T(laundry ? "সার্ভিস" : "সাইজ / ওজন", laundry ? "Service" : "Size / weight")}>
            {p.variants.map((x) => <option key={x.id} value={x.id}>{x.label} · {taka(x.price, locale)}</option>)}
          </select>
        ) : v ? <p className="text-xs font-semibold text-muted-foreground">{v.label}</p> : null}
        <p className="mt-auto flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-brand">{v ? taka(v.price, locale) : "—"}</span>
          {v && v.oldPrice > v.price ? <span className="text-xs font-semibold text-muted-foreground line-through">{taka(v.oldPrice, locale)}</span> : null}
        </p>
        <button
          type="button"
          disabled={soldOut}
          onClick={() => { if (v) { onAdd(v); setAdded(true); window.setTimeout(() => setAdded(false), 1200) } }}
          className={`h-10 w-full justify-center rounded-xl text-sm font-extrabold transition ${soldOut ? "bg-canvas text-muted-foreground" : added ? "bg-ok text-white" : "btn-soft ring-1 ring-brand/30"}`}
        >
          {soldOut ? T("স্টক নেই", "Sold out") : added ? T("✓ কার্টে যোগ হয়েছে", "✓ Added") : T("কার্টে যোগ করুন", "Add to cart")}
        </button>
      </div>
    </article>
  )
}
