"use client"

import { useEffect } from "react"
import { clearCart } from "@/lib/cart"

/** Rendered on the order confirmation page: empties the browser cart once the order exists. */
export function ClearCart() {
  useEffect(() => {
    clearCart()
  }, [])
  return null
}
