"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { Minus, Plus, Trash2 } from "lucide-react"
import { createShopOrderAction, priceCartAction } from "@/actions/shop"
import { checkCouponAction } from "@/actions/booking"
import { sendOtpAction } from "@/actions/auth"
import { ActionForm, SubmitButton } from "./forms"
import { taka, type Locale } from "@/lib/format"
import { photoUrl } from "@/lib/vehicles"
import { useCart } from "@/lib/cart"
import type { ShopRules } from "./shop-market"

type Line = { variantId: string; productId: string; name: string; nameBn: string; label: string; unitPrice: number; qty: number; lineTotal: number; photo: string }

/**
 * Checkout: the cart (re-priced by the server), delivery details, coupon,
 * payment and OTP for guests. Submits the cart as JSON; the server prices it again.
 */
export function ShopCheckout({ locale, categoryId, rules, payments, user, shopHref }: { locale: Locale; categoryId: string; rules: ShopRules; payments: Array<{ id: string; label: string; labelBn: string; hint: string; hintBn: string }>; user: { name: string; phone: string; address: string } | null; shopHref: string }) {
  const bn = locale === "bn"
  const T = (b: string, e: string) => (bn ? b : e)
  const { cart, setQty, clear } = useCart()
  const [lines, setLines] = useState<Line[] | null>(null)
  const [pricing, startPricing] = useTransition()
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [contactName, setContactName] = useState(user?.name ?? "")
  const [addressLine, setAddressLine] = useState(user?.address ?? "")
  const [landmark, setLandmark] = useState("")
  const [notes, setNotes] = useState("")
  const [payment, setPayment] = useState(payments[0]?.id ?? "CASH")
  const [otpNote, setOtpNote] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [sending, startSending] = useTransition()
  const [couponCode, setCouponCode] = useState("")
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null)
  const [couponNote, setCouponNote] = useState("")
  const [checkingCoupon, startCheckingCoupon] = useTransition()

  const cartJson = useMemo(() => JSON.stringify(cart.map((c) => ({ variantId: c.variantId, qty: c.qty }))), [cart])

  // Re-price whenever the cart changes (server is the source of truth for prices and stock).
  useEffect(() => {
    if (!cart.length) { startPricing(async () => setLines([])); return }
    const t = window.setTimeout(() => {
      startPricing(async () => {
        const r = await priceCartAction(cartJson)
        setLines(r.lines)
        setCoupon(null)
      })
    }, 150)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartJson])

  const subtotal = (lines ?? []).reduce((n, l) => n + l.lineTotal, 0)
  const delivery = rules.freeAbove && subtotal >= rules.freeAbove ? 0 : rules.delivery
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0
  const total = Math.max(0, subtotal + delivery - discount)
  const belowMin = subtotal > 0 && subtotal < rules.minOrder

  function sendCode() {
    const fd = new FormData()
    fd.set("phone", phone)
    startSending(async () => {
      const r = await sendOtpAction({}, fd)
      setOtpNote(r.error ?? r.message ?? "")
      if (r.ok) setOtpSent(true)
    })
  }

  function applyCoupon() {
    const fd = new FormData()
    fd.set("code", couponCode)
    fd.set("categoryId", categoryId)
    fd.set("work", String(subtotal))
    startCheckingCoupon(async () => {
      const r = await checkCouponAction(fd)
      if (r.ok && r.discount != null) { setCoupon({ code: couponCode.trim().toUpperCase(), discount: r.discount, label: r.label ?? "" }); setCouponNote("") }
      else { setCoupon(null); setCouponNote(r.error ?? "") }
    })
  }

  if (lines && !lines.length) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="font-extrabold text-ink">{T("কার্ট খালি", "Your cart is empty")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{T("শুঁটকি, আচার বা চাটনি বেছে কার্টে যোগ করুন।", "Pick some dried fish, pickles or chutney first.")}</p>
        <Link href={shopHref} className="btn-primary mt-4 inline-flex">{T("শপে যান", "Go to the shop")}</Link>
      </div>
    )
  }

  return (
    <ActionForm action={createShopOrderAction} resetOnSuccess={false} onDone={() => clear()} className="grid gap-4 pb-28 lg:grid-cols-[1fr_380px]">
      <input type="hidden" name="cart" value={cartJson} />
      <input type="hidden" name="paymentMethod" value={payment} />
      <input type="hidden" name="couponCode" value={coupon?.code ?? ""} />

      <div className="space-y-4">
        <section className="card divide-y divide-line p-2">
          {(lines ?? []).map((l) => (
            <div key={l.variantId} className="flex items-center gap-3 p-2">
              {l.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl(l.photo)} alt="" className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-line" />
              ) : <span className="size-16 shrink-0 rounded-xl bg-canvas" aria-hidden />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-ink">{bn ? l.nameBn || l.name : l.name || l.nameBn}</p>
                <p className="text-xs text-muted-foreground">{l.label} · {taka(l.unitPrice, locale)}</p>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-canvas p-0.5">
                  <button type="button" onClick={() => setQty(l.variantId, l.qty - 1)} className="grid size-7 place-items-center rounded-full bg-white text-ink ring-1 ring-line" aria-label="−"><Minus className="size-3" /></button>
                  <span className="w-6 text-center text-sm font-extrabold">{l.qty}</span>
                  <button type="button" onClick={() => setQty(l.variantId, l.qty + 1)} className="grid size-7 place-items-center rounded-full bg-white text-ink ring-1 ring-line" aria-label="+"><Plus className="size-3" /></button>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-extrabold text-ink">{taka(l.lineTotal, locale)}</span>
                <button type="button" onClick={() => setQty(l.variantId, 0)} className="text-muted-foreground hover:text-danger" aria-label={T("বাদ দিন", "Remove")}><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
          {!lines ? <p className="p-3 text-sm text-muted-foreground">{T("কার্ট লোড হচ্ছে…", "Loading cart…")}</p> : null}
        </section>
        {belowMin ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{T(`ন্যূনতম অর্ডার ${taka(rules.minOrder, locale)}; আরও ${taka(rules.minOrder - subtotal, locale)} যোগ করুন।`, `Minimum order is ${taka(rules.minOrder, locale)}; add ${taka(rules.minOrder - subtotal, locale)} more.`)} <Link href={shopHref} className="font-bold text-brand">{T("শপে ফিরুন →", "Back to shop →")}</Link></p> : null}

        <section className="card space-y-4 p-4">
          <h2 className="font-extrabold text-ink">{T("ডেলিভারি তথ্য", "Delivery details")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="contactName">{T("আপনার নাম", "Your name")}</label>
              <input id="contactName" name="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} className="field" maxLength={80} required />
            </div>
            <div>
              <label className="label" htmlFor="phone">{T("মোবাইল নম্বর", "Mobile number")}</label>
              <input id="phone" name="phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="field" placeholder="01XXXXXXXXX" maxLength={20} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="addressLine">{T("পুরো ঠিকানা (বাসা, রোড, এলাকা, থানা, জেলা)", "Full address (house, road, area, thana, district)")}</label>
            <textarea id="addressLine" name="addressLine" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} className="field" rows={2} maxLength={300} required placeholder={T("যেমন: বাসা ১২, রোড ৩, ধানমন্ডি, ঢাকা", "e.g. House 12, Road 3, Dhanmondi, Dhaka")} />
            <p className="mt-1 text-xs text-muted-foreground">{T("সারা বাংলাদেশে কুরিয়ারে পাঠাই; কক্সবাজার শহরে নিজেরা পৌঁছে দিই।", "We courier anywhere in Bangladesh; inside Cox's Bazar town we deliver ourselves.")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="landmark">{T("ল্যান্ডমার্ক (ঐচ্ছিক)", "Landmark (optional)")}</label>
              <input id="landmark" name="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} className="field" maxLength={120} />
            </div>
            <div>
              <label className="label" htmlFor="notes">{T("নোট (ঐচ্ছিক)", "Note (optional)")}</label>
              <input id="notes" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="field" maxLength={500} placeholder={T("যেমন: কম ঝাল, অফিসে ডেলিভারি", "e.g. less spicy, office delivery")} />
            </div>
          </div>
        </section>

        {!user ? (
          <section className="card p-4">
            <p className="font-extrabold text-ink">{T("মোবাইল নম্বর যাচাই", "Verify your mobile")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{T(`${phone || "আপনার"} নম্বরে একটা ৬ সংখ্যার কোড পাঠাব। অ্যাকাউন্ট খোলা লাগবে না।`, `We'll text a 6-digit code to ${phone || "your number"}. No account needed.`)}</p>
            <input type="hidden" name="name" value={contactName} />
            <div className="mt-3 flex gap-2">
              <input name="otp" inputMode="numeric" maxLength={6} pattern="\d{6}" placeholder="______" className="field flex-1 text-center text-lg tracking-[0.5em]" disabled={!otpSent} />
              <button type="button" onClick={sendCode} disabled={sending || !phone} className="btn-soft shrink-0 px-4">{sending ? "…" : otpSent ? T("আবার পাঠান", "Resend") : T("কোড পাঠান", "Send code")}</button>
            </div>
            {otpNote ? <p className="mt-2 text-sm font-semibold text-brand">{otpNote}</p> : null}
          </section>
        ) : null}
      </div>

      <div className="space-y-4">
        <section className="card p-4">
          <h2 className="font-extrabold text-ink">{T("অর্ডার সামারি", "Order summary")}</h2>
          <dl className="mt-2 divide-y divide-line text-sm">
            <div className="flex justify-between py-2"><dt className="text-muted-foreground">{T("সাবটোটাল", "Subtotal")}</dt><dd className="font-bold text-ink">{taka(subtotal, locale)}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-muted-foreground">{T("ডেলিভারি চার্জ", "Delivery")}</dt><dd className="font-bold text-ink">{delivery ? taka(delivery, locale) : T("ফ্রি", "Free")}</dd></div>
            {discount ? <div className="flex justify-between py-2"><dt className="text-muted-foreground">{T("ছাড়", "Discount")} ({coupon?.code})</dt><dd className="font-bold text-ok">−{taka(discount, locale)}</dd></div> : null}
            <div className="flex justify-between py-2 text-base"><dt className="font-extrabold text-ink">{T("মোট", "Total")}</dt><dd className="font-extrabold text-ink">{taka(total, locale)}</dd></div>
          </dl>
          {pricing ? <p className="mt-1 text-xs text-muted-foreground">{T("দাম মিলিয়ে দেখছি…", "Checking prices…")}</p> : null}
        </section>

        <section className="card p-4">
          <label className="label" htmlFor="coupon">{T("কুপন / ডিসকাউন্ট কোড (থাকলে)", "Coupon / discount code (optional)")}</label>
          <div className="flex gap-2">
            <input id="coupon" value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (coupon) { setCoupon(null); setCouponNote("") } }} className="field flex-1 uppercase" placeholder="HANDYO10" maxLength={20} autoCapitalize="characters" />
            <button type="button" onClick={applyCoupon} disabled={checkingCoupon || !couponCode.trim() || !subtotal} className="btn-soft shrink-0 px-4">{checkingCoupon ? "…" : T("প্রয়োগ", "Apply")}</button>
          </div>
          {coupon ? <p className="mt-2 text-sm font-semibold text-ok">✓ {coupon.label} · −{taka(discount, locale)}</p> : null}
          {couponNote ? <p className="mt-2 text-sm font-semibold text-danger">{couponNote}</p> : null}
        </section>

        <section className="card p-4">
          <p className="label">{T("পেমেন্ট পদ্ধতি", "Payment method")}</p>
          <div className="grid gap-2">
            {payments.map((p) => (
              <label key={p.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${payment === p.id ? "border-brand bg-brand-soft" : "border-line"}`}>
                <input type="radio" name="payment-choice" checked={payment === p.id} onChange={() => setPayment(p.id)} className="mt-1 accent-[var(--brand)]" />
                <span>
                  <span className="block font-bold text-ink">{p.id === "CASH" ? T("ক্যাশ অন ডেলিভারি (COD)", "Cash on delivery (COD)") : bn ? p.labelBn : p.label}</span>
                  <span className="block text-xs text-muted-foreground">{p.id === "CASH" ? T("পণ্য হাতে পেয়ে দেখে টাকা দিন", "Check the goods, then pay the courier") : bn ? p.hintBn : p.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
        <p className="text-xs text-muted-foreground">{T("অর্ডার কনফার্ম হলে নোটিশ পাবেন; কুরিয়ারে পাঠালে আবার জানাব। পণ্য পছন্দ না হলে ফেরত দেওয়া যাবে।", "You get a notice when the order is confirmed and again when it ships. Returns accepted if you don't like the product.")}</p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase">{T("মোট পরিশোধ", "Total to pay")}</p>
            <p className="text-lg font-extrabold text-ink">{taka(total, locale)}</p>
          </div>
          <SubmitButton className="btn-primary h-12 px-6" disabled={!lines?.length || belowMin || pricing} pendingText={T("অর্ডার হচ্ছে…", "Ordering…")}>{T("অর্ডার নিশ্চিত করুন", "Confirm order")}</SubmitButton>
        </div>
      </div>
    </ActionForm>
  )
}
