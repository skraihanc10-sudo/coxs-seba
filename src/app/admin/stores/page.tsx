import Link from "next/link"
import { Plus } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { photoUrl, photosOf } from "@/lib/vehicles"
import { shopStores, STORE_STATUS_TEXT } from "@/lib/shop"
import { named, pick } from "@/lib/i18n"
import type { Locale } from "@/lib/format"
import { reviewStoreAction } from "@/actions/shop"
import { ActionForm, SubmitButton } from "@/components/forms"
import { EmptyState, PageHeader } from "@/components/bits"

type StoreRow = Awaited<ReturnType<typeof shopStores>>[number]

const TONE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-canvas text-muted-foreground",
  REJECTED: "bg-rose-100 text-rose-700",
}

export default async function StoresPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/stores"), getLocale()])
  const shop = await officeShop(user)
  const stores = await shopStores(shop.id)
  const pending = stores.filter((s) => s.status === "PENDING")
  const live = stores.filter((s) => s.status === "APPROVED")
  const rest = stores.filter((s) => s.status === "PAUSED" || s.status === "REJECTED")
  return (
    <div className="space-y-6">
      <PageHeader
        title={pick(locale, "দোকান ও পার্টনার (শুঁটকি, আচার, লন্ড্রি)", "Stores & partners (dried fish, pickles, laundry)")}
        sub={pick(locale, `${shop.nameBn} · ${live.length}টি চালু · ${pending.length}টি অনুমোদনের অপেক্ষায়`, `${shop.name} · ${live.length} live · ${pending.length} waiting`)}
        action={<Link href="/admin/stores/new" className="btn-primary h-10 px-4 text-sm"><Plus className="size-4" /> {pick(locale, "নতুন দোকান", "Add store")}</Link>}
      />
      {!stores.length ? <EmptyState title={pick(locale, "এখনো কোনো দোকান নেই", "No stores yet")} body={pick(locale, "HANDYO-র নিজের দোকান যোগ করুন, বা মালিকরা /partner থেকে আবেদন করলে এখানে দেখাবে।", "Add HANDYO's own store, or wait for owners to apply at /partner.")} href="/admin/stores/new" action={pick(locale, "নতুন দোকান", "Add store")} /> : null}
      <Group title={pick(locale, "অনুমোদনের অপেক্ষায়", "Waiting for approval")} rows={pending} locale={locale} />
      <Group title={pick(locale, "চালু (সাইটে দেখাচ্ছে)", "Live on the site")} rows={live} locale={locale} />
      <Group title={pick(locale, "বন্ধ রাখা / বাতিল", "Paused / rejected")} rows={rest} locale={locale} />
    </div>
  )
}

function Group({ title, rows, locale }: { title: string; rows: StoreRow[]; locale: Locale }) {
  if (!rows.length) return null
  return (
    <section>
      <h2 className="display mb-3 text-lg font-extrabold text-ink">{title} <span className="text-sm font-bold text-muted-foreground">({rows.length})</span></h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((s) => <StoreCard key={s.id} s={s} locale={locale} />)}
      </div>
    </section>
  )
}

function StoreCard({ s, locale }: { s: StoreRow; locale: Locale }) {
  const cover = photosOf(s)[0]
  const status = STORE_STATUS_TEXT[s.status]
  return (
    <div className={`card space-y-2 p-4 ${s.status === "REJECTED" || s.status === "PAUSED" ? "opacity-80" : ""}`}>
      <div className="flex items-start gap-3">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(cover)} alt="" className="size-14 shrink-0 rounded-xl object-cover ring-1 ring-line" />
        ) : <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg font-extrabold text-brand" aria-hidden>{named(locale, s).slice(0, 1)}</span>}
        <div className="min-w-0 flex-1">
          <Link href={`/admin/stores/${s.id}`} className="block truncate font-extrabold text-ink hover:text-brand">{named(locale, s)}</Link>
          <p className="text-xs text-muted-foreground">{locale === "bn" ? s.addressBn || s.address : s.address || s.addressBn}</p>
          <p className="text-xs text-muted-foreground">{s._count.products} {pick(locale, "পণ্য", "products")} · {s._count.orders} {pick(locale, "অর্ডার", "orders")}</p>
        </div>
        <span className={`pill shrink-0 ${TONE[s.status] ?? "bg-canvas"}`}>{status ? pick(locale, status.bn, status.en) : s.status}</span>
      </div>
      <p className="text-sm">
        {s.worker ? (
          <>
            <span className="font-bold text-ink">{pick(locale, "মালিক:", "Owner:")}</span> {s.worker.user.name}{s.worker.user.phone ? ` · ${s.worker.user.phone}` : ""}
            {!s.worker.approved ? <span className="pill ml-1 bg-amber-100 text-amber-800">{pick(locale, "নতুন পার্টনার", "new partner")}</span> : null}
            {s.worker.autoAssign ? <span className="pill ml-1 bg-emerald-100 text-emerald-800">{pick(locale, "সরাসরি অর্ডার", "direct orders")}</span> : null}
          </>
        ) : <span className="font-bold text-brand">{pick(locale, "HANDYO-র নিজের দোকান", "HANDYO's own store")}</span>}
      </p>
      {s.rejectNote ? <p className="text-xs text-danger">{pick(locale, "বাতিলের কারণ:", "Reject reason:")} {s.rejectNote}</p> : null}
      {s.status === "PENDING" || s.status === "REJECTED" ? (
        <div className="space-y-2 pt-1">
          {s.status === "PENDING" ? (
            <ActionForm action={reviewStoreAction} resetOnSuccess={false}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="decision" value="APPROVE" />
              <SubmitButton className="btn-primary h-10 w-full text-sm">{pick(locale, "অনুমোদন দিন", "Approve")}</SubmitButton>
            </ActionForm>
          ) : null}
          {s.status === "PENDING" ? (
            <ActionForm action={reviewStoreAction} resetOnSuccess={false} className="flex gap-2">
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="decision" value="REJECT" />
              <input name="note" className="field h-10 flex-1 text-sm" placeholder={pick(locale, "বাতিলের কারণ", "Reject reason")} required minLength={3} maxLength={300} />
              <SubmitButton className="btn-danger h-10 shrink-0 px-3 text-sm">{pick(locale, "বাতিল", "Reject")}</SubmitButton>
            </ActionForm>
          ) : (
            <ActionForm action={reviewStoreAction} resetOnSuccess={false}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="decision" value="APPROVE" />
              <SubmitButton className="btn-soft h-10 w-full text-sm">{pick(locale, "তবু অনুমোদন দিন", "Approve anyway")}</SubmitButton>
            </ActionForm>
          )}
        </div>
      ) : null}
      {s.status === "APPROVED" || s.status === "PAUSED" ? (
        <div className="flex items-center gap-2 pt-1">
          <ActionForm action={reviewStoreAction} resetOnSuccess={false} className="flex-1">
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="decision" value={s.status === "APPROVED" ? "PAUSE" : "RESUME"} />
            <SubmitButton className="btn-soft h-10 w-full text-sm">{s.status === "APPROVED" ? pick(locale, "বন্ধ রাখুন", "Pause") : pick(locale, "আবার চালু", "Resume")}</SubmitButton>
          </ActionForm>
          <Link href={`/admin/stores/${s.id}`} className="btn-soft h-10 px-4 text-sm">{pick(locale, "সম্পাদনা", "Edit")}</Link>
        </div>
      ) : null}
    </div>
  )
}
