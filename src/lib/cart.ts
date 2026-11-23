"use client"

import { useEffect, useState } from "react"

/** The browser-side cart of the product shop: variant ids and quantities, kept in localStorage. */
export type CartEntry = { variantId: string; productId: string; qty: number }

const KEY = "handyo_cart"

export function readCart(): CartEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is CartEntry => !!x && typeof x === "object" && typeof (x as CartEntry).variantId === "string").map((x) => ({ ...x, qty: Math.max(1, Math.round(Number(x.qty) || 1)) })) : []
  } catch {
    return []
  }
}

export function writeCart(entries: CartEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries))
    window.dispatchEvent(new Event("handyo-cart"))
  } catch {
    /* private mode: the cart just lives in memory for this page */
  }
}

export function clearCart() {
  writeCart([])
}

/** React hook: the cart, kept in sync across components and tabs. */
export function useCart() {
  const [cart, setCart] = useState<CartEntry[]>([])
  useEffect(() => {
    const load = () => setCart(readCart())
    load()
    window.addEventListener("handyo-cart", load)
    window.addEventListener("storage", load)
    return () => {
      window.removeEventListener("handyo-cart", load)
      window.removeEventListener("storage", load)
    }
  }, [])
  const set = (next: CartEntry[]) => {
    setCart(next)
    writeCart(next)
  }
  const add = (variantId: string, productId: string, qty = 1) => {
    const current = readCart()
    const hit = current.find((c) => c.variantId === variantId)
    set(hit ? current.map((c) => (c.variantId === variantId ? { ...c, qty: Math.min(99, c.qty + qty) } : c)) : [...current, { variantId, productId, qty }])
  }
  const setQty = (variantId: string, qty: number) => {
    const current = readCart()
    set(qty <= 0 ? current.filter((c) => c.variantId !== variantId) : current.map((c) => (c.variantId === variantId ? { ...c, qty: Math.min(99, qty) } : c)))
  }
  const count = cart.reduce((n, c) => n + c.qty, 0)
  return { cart, add, setQty, clear: () => set([]), count }
}
