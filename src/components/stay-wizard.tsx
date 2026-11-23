"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { Check, ChevronLeft } from "lucide-react"
import { checkStayAction, createStayBookingAction } from "@/actions/stays"
import { checkCouponAction } from "@/actions/booking"
import { sendOtpAction } from "@/actions/auth"
import { ActionForm, SubmitButton } from "./forms"
import { formatDay, localToday, shiftDays, taka, type Locale } from "@/lib/format"
import { photoUrl } from "@/lib/vehicles"

export type StayRoom = { id: string; name: string; sleeps: number; pricePerNight: number; totalRooms: number; amenities: string }

export type StayWizardProps = {
  locale: Locale
  shop: { city: string; cityBn: string }
  categoryId: string
  property: { id: string; name: string; nameBn: string; kind: string; area: string; photo: string; checkIn: string; checkOut: string; policy: string; owner: string }
  rooms: StayRoom[]
  initialRoomId: string
  payments: Array<{ id: string; label: string; labelBn: string; hint: string; hintBn: string }>
  user: { name: string; phone: string } | null
  maxNights: number
}

/**
 * Three steps: dates + room + guests (with live availability), contact (OTP for
 * guests), then coupon + payment + confirm. Price = nights × rooms × nightly rate.
 */
export function StayWizard({ locale, property, rooms, initialRoomId, payments, user, categoryId, maxNights }: StayWizardProps) {
  const bn = locale === "bn"
  const T = (b: string, e: string) => (bn ? b : e)
  const today = localToday()
  const [step, setStep] = useState(1)
  const [roomId, setRoomId] = useState(rooms.find((r) => r.id === initialRoomId)?.id ?? rooms[0]?.id ?? "")
  const room = rooms.find((r) => r.id === roomId) ?? rooms[0]
  const [checkIn, setCheckIn] = useState(today)
  const [checkOut, setCheckOut] = useState(shiftDays(today, 1))
  const [roomCount, setRoomCount] = useState(1)
  const [guests, setGuests] = useState(2)
  const [check, setCheck] = useState<{ nights: number; total: number; available: number } | null>(null)
  const [checkNote, setCheckNote] = useState("")
  const [checking, startChecking] = useTransition()
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [contactName, setContactName] = useState(user?.name ?? "")
  const [notes, setNotes] = useState("")
  const [payment, setPayment] = useState(payments[0]?.id ?? "CASH")
  const [otpNote, setOtpNote] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [sending, startSending] = useTransition()
  const [couponCode, setCouponCode] = useState("")
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null)
  const [couponNote, setCouponNote] = useState("")
  const [checkingCoupon, startCheckingCoupon] = useTransition()
  const [problem, setProblem] = useState("")

  const nights = Math.max(0, Math.round((new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()) / 86400000))
  const work = room ? nights * roomCount * room.pricePerNight : 0
  const discount = coupon ? Math.min(coupon.discount, work) : 0
  const payable = Math.max(0, work - discount)

  // Re-check availability whenever the dates, room or count change.
  useEffect(() => {
    if (!room || nights < 1) return
    const fd = new FormData()
    fd.set("propertyId", property.id)
    fd.set("roomTypeId", room.id)
    fd.set("checkIn", checkIn)
    fd.set("checkOut", checkOut)
    fd.set("rooms", String(roomCount))
    fd.set("guests", String(guests))
    const t = window.setTimeout(() => {
      startChecking(async () => {
        setCheck(null)
        setCheckNote("")
        setCoupon(null)
        const r = await checkStayAction(fd)
        if (r.ok && r.nights != null) setCheck({ nights: r.nights, total: r.total ?? 0, available: r.available ?? 0 })
        else setCheckNote(r.error ?? "")
      })
    }, 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, checkIn, checkOut, roomCount, guests])

  function next() {
    setProblem("")
    if (step === 1) {
      if (!room) return setProblem(T("একটা রুম বেছে নিন।", "Pick a room."))
      if (nights < 1) return setProblem(T("চেক-আউট চেক-ইনের পরে দিন।", "Check-out must be after check-in."))
      if (nights > maxNights) return setProblem(T(`একবারে সর্বোচ্চ ${maxNights} রাত।`, `Up to ${maxNights} nights per booking.`))
      if (checkNote) return setProblem(checkNote)
      if (!check) return setProblem(T("একটু অপেক্ষা করুন, রুম খালি আছে কি না দেখছি…", "One moment, checking availability…"))
    }
    if (step === 2) {
      if (!/^(\+?88)?01[3-9]\d{8}$/.test(phone.replace(/[\s-]/g, ""))) return setProblem(T("সঠিক মোবাইল নম্বর দিন (০১ দিয়ে শুরু, ১১ সংখ্যা)।", "Enter a valid mobile number (11 digits, starting with 01)."))
      if (contactName.trim().length < 2) return setProblem(T("নাম দিন।", "Add your name."))
    }
    setStep((s) => Math.min(3, s + 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

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
    fd.set("work", String(work))
    startCheckingCoupon(async () => {
      const r = await checkCouponAction(fd)
      if (r.ok && r.discount != null) {
        setCoupon({ code: couponCode.trim().toUpperCase(), discount: r.discount, label: r.label ?? "" })
        setCouponNote("")
      } else {
        setCoupon(null)
        setCouponNote(r.error ?? "")
      }
    })
  }

  const stepTitles = [T("তারিখ ও রুম", "Dates & room"), T("আপনার তথ্য", "Your details"), T("নিশ্চিত করুন", "Confirm")]
  const name = bn ? property.nameBn : property.name

  return (
    <ActionForm action={createStayBookingAction} resetOnSuccess={false} className="pb-28">
      <input type="hidden" name="propertyId" value={property.id} />
      <input type="hidden" name="roomTypeId" value={room?.id ?? ""} />
      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />
      <input type="hidden" name="rooms" value={roomCount} />
      <input type="hidden" name="guests" value={guests} />
      <input type="hidden" name="paymentMethod" value={payment} />
      <input type="hidden" name="couponCode" value={coupon?.code ?? ""} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="contactName" value={contactName} />

      <ol className="mb-5 flex items-center gap-2 text-xs font-bold" aria-label={T("ধাপ", "Steps")}>
        {stepTitles.map((t, i) => (
          <li key={t} className="flex items-center gap-2">
            <span className={`grid size-7 place-items-center rounded-full ${step > i + 1 ? "bg-ok text-white" : step === i + 1 ? "bg-brand text-white" : "bg-canvas text-muted-foreground"}`}>{step > i + 1 ? <Check className="size-4" /> : i + 1}</span>
            <span className={step === i + 1 ? "text-ink" : "text-muted-foreground"}>{t}</span>
            {i < 2 ? <span className="mx-1 h-px w-5 bg-line" aria-hidden /> : null}
          </li>
        ))}
      </ol>

      {/* Step 1: dates, room, guests */}
      <section className={step === 1 ? "space-y-4" : "hidden"}>
        <div className="card overflow-hidden">
          {property.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl(property.photo)} alt={name} className="aspect-[16/8] w-full object-cover" />
          ) : null}
          <div className="p-4">
            <h2 className="display text-xl font-extrabold text-ink">{name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{property.area} · {property.owner} · {T("চেক-ইন", "Check-in")} {property.checkIn}, {T("চেক-আউট", "check-out")} {property.checkOut}</p>
          </div>
        </div>

        <div className="card space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="checkInDate">{T("চেক-ইন", "Check-in")}</label>
              <input id="checkInDate" type="date" value={checkIn} min={today} onChange={(e) => { const v = e.target.value; setCheckIn(v); if (checkOut <= v) setCheckOut(shiftDays(v, 1)) }} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="checkOutDate">{T("চেক-আউট", "Check-out")}</label>
              <input id="checkOutDate" type="date" value={checkOut} min={shiftDays(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} className="field" />
            </div>
          </div>
          <p className="text-sm font-bold text-ink">{nights > 0 ? T(`${nights} রাত · ${formatDay(checkIn, locale)} → ${formatDay(checkOut, locale)}`, `${nights} night${nights > 1 ? "s" : ""} · ${formatDay(checkIn, locale)} → ${formatDay(checkOut, locale)}`) : T("চেক-আউট চেক-ইনের পরের দিন বা পরে দিন", "Check-out must be after check-in")}</p>
        </div>

        <div className="space-y-2" role="radiogroup" aria-label={T("রুমের ধরন", "Room type")}>
          {rooms.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={r.id === room?.id} onClick={() => setRoomId(r.id)} className={`card flex w-full items-center justify-between gap-3 p-4 text-left transition ${r.id === room?.id ? "ring-2 ring-brand" : "hover:ring-brand/40"}`}>
              <span className="min-w-0">
                <span className="block font-extrabold text-ink">{r.name}</span>
                <span className="block text-xs text-muted-foreground">{T(`${r.sleeps} জন`, `Sleeps ${r.sleeps}`)}{r.amenities ? ` · ${r.amenities}` : ""}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-lg font-extrabold text-brand">{taka(r.pricePerNight, locale)}</span>
                <span className="block text-[11px] font-semibold text-muted-foreground">/{T("রাত", "night")}</span>
              </span>
            </button>
          ))}
        </div>

        <Counter label={T("কয়টা রুম?", "How many rooms?")} value={roomCount} min={1} max={Math.min(10, room?.totalRooms ?? 10)} onChange={setRoomCount} />
        <Counter label={T("কতজন থাকবেন?", "How many guests?")} value={guests} min={1} max={60} onChange={setGuests} hint={room ? T(`প্রতি রুমে ${room.sleeps} জন`, `${room.sleeps} per room`) : undefined} />

        {checking ? <p className="text-sm font-semibold text-muted-foreground">{T("খালি আছে কি না দেখছি…", "Checking availability…")}</p> : null}
        {check && !checking ? <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">✓ {T(`এই তারিখে ${check.available}টা রুম খালি · মোট ${taka(check.total, locale)}`, `${check.available} room(s) free on these dates · total ${taka(check.total, locale)}`)}</p> : null}
        {checkNote && !checking ? <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-semibold text-danger">{checkNote}</p> : null}

        <div className="card p-4">
          <label className="label" htmlFor="stayNotes">{T("বিশেষ অনুরোধ (ঐচ্ছিক)", "Special requests (optional)")}</label>
          <textarea id="stayNotes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} className="field" placeholder={T("যেমন: সি ভিউ রুম চাই, দেরিতে চেক-ইন, বাচ্চার খাট", "e.g. sea view please, late check-in, a cot")} />
        </div>
      </section>

      {/* Step 2: contact */}
      <section className={step === 2 ? "space-y-4" : "hidden"}>
        <div className="card space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="stayPhone">{T("মোবাইল নম্বর", "Mobile number")}</label>
              <input id="stayPhone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="field" placeholder="01XXXXXXXXX" maxLength={20} />
            </div>
            <div>
              <label className="label" htmlFor="stayName">{T("নাম", "Name")}</label>
              <input id="stayName" value={contactName} onChange={(e) => setContactName(e.target.value)} className="field" placeholder={T("যার নামে বুকিং", "Booking name")} maxLength={80} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{T("রিসোর্ট এই নম্বরে যোগাযোগ করতে পারে; বুকিংয়ের পর চ্যাটেও কথা বলা যাবে।", "The resort may call this number; you can also chat after booking.")}</p>
        </div>
        {!user ? (
          <div className="card p-4">
            <p className="font-extrabold text-ink">{T("মোবাইল নম্বর যাচাই", "Verify your mobile")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{T(`${phone} নম্বরে একটা ৬ সংখ্যার কোড পাঠাব। অ্যাকাউন্ট খোলা লাগবে না।`, `We'll text a 6-digit code to ${phone}. No account needed.`)}</p>
            <input type="hidden" name="name" value={contactName} />
            <div className="mt-3 flex gap-2">
              <input name="otp" inputMode="numeric" maxLength={6} pattern="\d{6}" placeholder="______" className="field flex-1 text-center text-lg tracking-[0.5em]" disabled={!otpSent} />
              <button type="button" onClick={sendCode} disabled={sending} className="btn-soft shrink-0 px-4">{sending ? "…" : otpSent ? T("আবার পাঠান", "Resend") : T("কোড পাঠান", "Send code")}</button>
            </div>
            {otpNote ? <p className="mt-2 text-sm font-semibold text-brand">{otpNote}</p> : null}
          </div>
        ) : null}
      </section>

      {/* Step 3: confirm */}
      <section className={step === 3 ? "space-y-4" : "hidden"}>
        <div className="card divide-y divide-line p-4 text-[15px]">
          <Line k={T("রিসোর্ট", "Property")} v={`${name} · ${property.area}`} />
          <Line k={T("রুম", "Room")} v={room ? `${room.name} × ${roomCount} · ${guests} ${T("জন", "guests")}` : "—"} />
          <Line k={T("তারিখ", "Dates")} v={`${formatDay(checkIn, locale)} → ${formatDay(checkOut, locale)} · ${nights} ${T("রাত", "nights")}`} />
          <Line k={T("দাম", "Price")} v={room ? `${nights} × ${roomCount} × ${taka(room.pricePerNight, locale)} = ${taka(work, locale)}` : "—"} />
          <Line k={T("যোগাযোগ", "Contact")} v={`${contactName || "—"} · ${phone}`} />
          {notes ? <Line k={T("অনুরোধ", "Requests")} v={notes} /> : null}
          {coupon ? <Line k={T("ছাড়", "Discount")} v={`${coupon.code} · −${taka(discount, locale)}`} /> : null}
        </div>
        {property.policy ? <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted-foreground">{property.policy}</p> : null}

        <div className="card p-4">
          <label className="label" htmlFor="stayCoupon">{T("কুপন / ডিসকাউন্ট কোড (থাকলে)", "Coupon / discount code (optional)")}</label>
          <div className="flex gap-2">
            <input id="stayCoupon" value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (coupon) { setCoupon(null); setCouponNote("") } }} className="field flex-1 uppercase" placeholder="HANDYO10" maxLength={20} autoCapitalize="characters" />
            <button type="button" onClick={applyCoupon} disabled={checkingCoupon || !couponCode.trim()} className="btn-soft shrink-0 px-4">{checkingCoupon ? "…" : T("প্রয়োগ", "Apply")}</button>
          </div>
          {coupon ? <p className="mt-2 text-sm font-semibold text-ok">✓ {coupon.label} · −{taka(discount, locale)}</p> : null}
          {couponNote ? <p className="mt-2 text-sm font-semibold text-danger">{couponNote}</p> : null}
        </div>

        <div className="card p-4">
          <p className="label">{T("কীভাবে টাকা দেবেন? (চেক-ইনে)", "How will you pay? (at check-in)")}</p>
          <div className="grid gap-2">
            {payments.map((p) => (
              <label key={p.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${payment === p.id ? "border-brand bg-brand-soft" : "border-line"}`}>
                <input type="radio" name="payment-choice" checked={payment === p.id} onChange={() => setPayment(p.id)} className="mt-1 accent-[var(--brand)]" />
                <span>
                  <span className="block font-bold text-ink">{bn ? p.labelBn : p.label}</span>
                  <span className="block text-xs text-muted-foreground">{bn ? p.hintBn : p.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{T("বুকিং দিলে HANDYO অফিস রিসোর্টকে জানায়; রিসোর্ট নিশ্চিত করলে নোটিশ পাবেন।", "Once booked, the HANDYO office alerts the resort; you get a notice when it confirms.")} <Link href={`/stays/${property.id}`} className="font-bold text-brand">{T("রিসোর্ট পেজ →", "Property page →")}</Link></p>
      </section>

      {problem ? <p role="alert" className="mt-3 rounded-xl bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm font-semibold text-danger">{problem}</p> : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase">{T("মোট (চেক-ইনে দেবেন)", "Total (pay at check-in)")}</p>
            <p className="text-lg font-extrabold text-ink">
              {discount ? <><span className="mr-2 text-sm font-semibold text-muted-foreground line-through">{taka(work, locale)}</span>{taka(payable, locale)}</> : taka(work, locale)}
              {nights > 0 && room ? <span className="ml-1 text-xs font-semibold text-muted-foreground">({nights} {T("রাত", "n")} × {roomCount})</span> : null}
            </p>
          </div>
          {step > 1 ? <button type="button" onClick={() => { setProblem(""); setStep((s) => s - 1) }} className="btn-ghost h-12 px-4" aria-label="Back"><ChevronLeft className="size-5" /></button> : null}
          {step < 3 ? (
            <button type="button" onClick={next} className="btn-primary h-12 px-6">{T("পরের ধাপ", "Next")}</button>
          ) : (
            <SubmitButton className="btn-primary h-12 px-6" pendingText={T("বুক হচ্ছে…", "Booking…")}>{T("বুকিং নিশ্চিত করুন", "Confirm booking")}</SubmitButton>
          )}
        </div>
      </div>
    </ActionForm>
  )
}

function Counter({ label, value, min, max, onChange, hint }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div>
        <p className="font-bold text-ink">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="btn-soft size-10 justify-center p-0 text-lg" aria-label="−">−</button>
        <input type="number" value={value} min={min} max={max} onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))} className="field h-10 w-16 text-center" />
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="btn-soft size-10 justify-center p-0 text-lg" aria-label="+">+</button>
      </div>
    </div>
  )
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className="text-right font-bold text-ink">{v}</span>
    </div>
  )
}
