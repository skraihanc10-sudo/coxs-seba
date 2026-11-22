import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { db } from "@/lib/db"
import { named, pick } from "@/lib/i18n"
import { formatDay, type Locale } from "@/lib/format"
import { describeCoupon, shopCoupons } from "@/lib/coupons"
import { saveCouponAction, toggleCouponAction } from "@/actions/admin"
import { ActionForm, SubmitButton } from "@/components/forms"
import { EmptyState, PageHeader, Section } from "@/components/bits"

type Coupon = Awaited<ReturnType<typeof shopCoupons>>[number]
type Category = { id: string; name: string; nameBn: string }

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "")

export default async function CouponsPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/coupons"), getLocale()])
  const shop = await officeShop(user)
  const [coupons, categories] = await Promise.all([
    shopCoupons(shop.id),
    db.serviceCategory.findMany({ where: { shopId: shop.id }, orderBy: { sort: "asc" }, select: { id: true, name: true, nameBn: true } }),
  ])
  return (
    <div className="space-y-4">
      <PageHeader title={pick(locale, "কুপন ও ডিসকাউন্ট", "Coupons & discounts")} sub={pick(locale, `${shop.nameBn} শপের কুপন। ছাড় শুধু কাজের দামে, এলাকা/ভিজিট চার্জে নয়; কাস্টমার বুকিংয়ের শেষ ধাপে কোড দেয়।`, `Coupons for ${shop.name}. Discounts apply to the work price only, never the area/visit charge; customers enter the code at the last booking step.`)} />

      <Section title={pick(locale, "নতুন কুপন", "New coupon")}>
        <ActionForm action={saveCouponAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CouponFields locale={locale} categories={categories} />
          <SubmitButton className="btn-primary h-10 px-4 text-sm sm:col-span-2 lg:col-span-3">{pick(locale, "কুপন তৈরি করুন", "Create coupon")}</SubmitButton>
        </ActionForm>
      </Section>

      {coupons.length === 0 ? (
        <EmptyState title={pick(locale, "এখনো কোনো কুপন নেই", "No coupons yet")} body={pick(locale, "উপরের ফর্ম থেকে প্রথম কুপন বানান।", "Create your first coupon with the form above.")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {coupons.map((c) => <CouponCard key={c.id} c={c} locale={locale} categories={categories} />)}
        </div>
      )}
    </div>
  )
}

function CouponCard({ c, locale, categories }: { c: Coupon; locale: Locale; categories: Category[] }) {
  const validity =
    c.startsAt || c.endsAt
      ? `${c.startsAt ? formatDay(day(c.startsAt), locale) : "…"} → ${c.endsAt ? formatDay(day(c.endsAt), locale) : "…"}`
      : pick(locale, "সব সময়", "Always")
  return (
    <div className={`card space-y-3 p-4 ${c.active ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-2xl font-extrabold tracking-wider text-ink">{c.code}</p>
          <p className="text-sm font-semibold text-brand">{describeCoupon(c, locale)}</p>
        </div>
        <span className={`pill shrink-0 ${c.active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>{c.active ? pick(locale, "চালু", "On") : pick(locale, "বন্ধ", "Off")}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{pick(locale, "সেবা", "Service")}</dt>
        <dd className="font-semibold text-ink">{c.category ? named(locale, c.category) : pick(locale, "সব সেবা", "All services")}</dd>
        <dt className="text-muted-foreground">{pick(locale, "মেয়াদ", "Validity")}</dt>
        <dd className="font-semibold text-ink">{validity}</dd>
        <dt className="text-muted-foreground">{pick(locale, "ব্যবহার", "Used")}</dt>
        <dd className="font-semibold text-ink">{c.usedCount} / {c.usageLimit > 0 ? c.usageLimit : "∞"}{c.perCustomer > 0 ? <span className="ml-1 text-xs font-normal text-muted-foreground">· {pick(locale, `প্রতি কাস্টমার ${c.perCustomer}`, `${c.perCustomer} per customer`)}</span> : null}</dd>
        <dt className="text-muted-foreground">{pick(locale, "বুকিং", "Bookings")}</dt>
        <dd className="font-semibold text-ink">{c._count.bookings}</dd>
      </dl>
      {c.note ? <p className="text-xs text-muted-foreground">{c.note}</p> : null}
      <details className="rounded-xl bg-canvas p-3">
        <summary className="cursor-pointer list-none text-sm font-bold text-ink">{pick(locale, "সম্পাদনা", "Edit")}</summary>
        <ActionForm action={saveCouponAction} resetOnSuccess={false} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={c.id} />
          <CouponFields locale={locale} categories={categories} c={c} />
          <SubmitButton className="btn-soft h-9 px-3 text-xs sm:col-span-2">{pick(locale, "সেভ", "Save")}</SubmitButton>
        </ActionForm>
      </details>
      <form action={toggleCouponAction} className="text-right">
        <input type="hidden" name="id" value={c.id} />
        <button className="text-xs font-bold text-muted-foreground hover:text-ink">{c.active ? pick(locale, "বন্ধ করুন", "Turn off") : pick(locale, "চালু করুন", "Turn on")}</button>
      </form>
    </div>
  )
}

/** The coupon inputs, shared by the create form and each card's edit form. */
function CouponFields({ locale, categories, c }: { locale: Locale; categories: Category[]; c?: Coupon }) {
  const p = c ? c.id : "new"
  return (
    <>
      <div>
        <label className="label" htmlFor={`${p}-code`}>{pick(locale, "কোড", "Code")}</label>
        <input id={`${p}-code`} name="code" defaultValue={c?.code} className="field h-10 font-mono uppercase" placeholder="EID20" required minLength={3} maxLength={20} pattern="[A-Za-z0-9-]{3,20}" autoCapitalize="characters" style={{ textTransform: "uppercase" }} />
      </div>
      <div>
        <label className="label" htmlFor={`${p}-kind`}>{pick(locale, "ছাড়ের ধরন", "Discount type")}</label>
        <select id={`${p}-kind`} name="kind" defaultValue={c?.kind ?? "PERCENT"} className="field h-10">
          <option value="PERCENT">{pick(locale, "শতাংশ ছাড়", "Percent off")}</option>
          <option value="FIXED">{pick(locale, "নির্দিষ্ট টাকা ছাড়", "Fixed taka off")}</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${p}-value`}>{pick(locale, "ছাড়ের মান (% বা ৳)", "Value (% or ৳)")}</label>
        <input id={`${p}-value`} name="value" type="number" defaultValue={c?.value ?? 10} className="field h-10" min={1} max={500000} required />
      </div>
      <div>
        <label className="label" htmlFor={`${p}-maxDiscount`}>{pick(locale, "সর্বোচ্চ ছাড় (৳)", "Max discount (৳)")}</label>
        <input id={`${p}-maxDiscount`} name="maxDiscount" type="number" defaultValue={c?.maxDiscount ?? 0} className="field h-10" min={0} />
        <p className="mt-1 text-xs text-muted-foreground">{pick(locale, "শুধু শতাংশে, ০ = সীমা নেই", "Percent only, 0 = no cap")}</p>
      </div>
      <div>
        <label className="label" htmlFor={`${p}-minAmount`}>{pick(locale, "ন্যূনতম কাজের দাম (৳)", "Minimum work price (৳)")}</label>
        <input id={`${p}-minAmount`} name="minAmount" type="number" defaultValue={c?.minAmount ?? 0} className="field h-10" min={0} />
      </div>
      <div>
        <label className="label" htmlFor={`${p}-categoryId`}>{pick(locale, "সেবা", "Service")}</label>
        <select id={`${p}-categoryId`} name="categoryId" defaultValue={c?.categoryId ?? ""} className="field h-10">
          <option value="">{pick(locale, "সব সেবা", "All services")}</option>
          {categories.map((cat) => <option key={cat.id} value={cat.id}>{named(locale, cat)}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${p}-startsAt`}>{pick(locale, "শুরু", "Starts")}</label>
        <input id={`${p}-startsAt`} name="startsAt" type="date" defaultValue={day(c?.startsAt ?? null)} className="field h-10" />
      </div>
      <div>
        <label className="label" htmlFor={`${p}-endsAt`}>{pick(locale, "শেষ", "Ends")}</label>
        <input id={`${p}-endsAt`} name="endsAt" type="date" defaultValue={day(c?.endsAt ?? null)} className="field h-10" />
      </div>
      <div>
        <label className="label" htmlFor={`${p}-usageLimit`}>{pick(locale, "মোট ব্যবহার", "Total uses")}</label>
        <input id={`${p}-usageLimit`} name="usageLimit" type="number" defaultValue={c?.usageLimit ?? 0} className="field h-10" min={0} />
        <p className="mt-1 text-xs text-muted-foreground">{pick(locale, "০ = সীমাহীন", "0 = unlimited")}</p>
      </div>
      <div>
        <label className="label" htmlFor={`${p}-perCustomer`}>{pick(locale, "প্রতি কাস্টমার", "Per customer")}</label>
        <input id={`${p}-perCustomer`} name="perCustomer" type="number" defaultValue={c?.perCustomer ?? 1} className="field h-10" min={0} max={1000} />
        <p className="mt-1 text-xs text-muted-foreground">{pick(locale, "০ = সীমাহীন", "0 = unlimited")}</p>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`${p}-note`}>{pick(locale, "নোট (শুধু অফিসের জন্য)", "Note (office only)")}</label>
        <input id={`${p}-note`} name="note" defaultValue={c?.note ?? ""} className="field h-10" maxLength={200} placeholder={pick(locale, "যেমন: ঈদ অফার, ফেসবুক পোস্ট", "e.g. Eid offer, Facebook post")} />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
        <input type="checkbox" name="active" defaultChecked={c ? c.active : true} className="size-4 accent-[var(--brand)]" /> {pick(locale, "চালু", "Active")}
      </label>
    </>
  )
}
