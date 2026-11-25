import { NextResponse } from "next/server"
import { currentShop } from "@/lib/shops"
import { search, suggestions } from "@/lib/search"

/** Live suggestions for the search box: `?q=` → ranked hits, or a light strip of our items when nothing matched. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80)
  const shop = await currentShop()
  const hits = q.trim().length >= 2 ? await search(shop.id, q, 8) : []
  const suggested = !hits.length
  const list = suggested ? await suggestions(shop.id, 6) : hits
  return NextResponse.json({ q, suggested, hits: list }, { headers: { "cache-control": "no-store" } })
}
