import Link from "next/link"
import { Pencil, Plus } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { taka } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { photoUrl, photosOf } from "@/lib/vehicles"
import { allProducts, partnerStore, priceRange, productName, STORE_STATUS_TEXT } from "@/lib/shop"
import { partnerStoreAction, partnerToggleProductAction } from "@/actions/shop"
import { EmptyState, PageHeader, Section } from "@/components/bits"
import { StoreForm } from "@/components/partner/store-form"

/** The partner's store: its details, status, and its products. */
export default async function PartnerStorePage() {
  const [user, locale] = await Promise.all([requireUser(["WORKER"], "/worker/store"), getLocale()])
  const store = user.worker ? await partnerStore(user.worker.id) : null
  const products = store ? await allProducts(store.shopId, store.id) : []
  const status = store ? STORE_STATUS_TEXT[store.status] : null
  const live = store && (store.status === "APPROVED" || store.status === "PAUSED")
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={store ? named(locale, store) : pick(locale, "আমার দোকান", "My store")}
        sub={store ? `${status ? pick(locale, status.bn, status.en) : store.status} · ${products.filter((p) => p.active).length} ${pick(locale, "পণ্য সাইটে", "products live")}` : pick(locale, "দোকানের তথ্য দিন; অ্যাডমিন অনুমোদন দিলে পণ্য যোগ করতে পারবেন।", "Set up your store; add products once the admin approves it.")}
        action={live ? <Link href="/worker/store/products/new" className="btn-primary h-10 shrink-0 px-3 text-sm"><Plus className="size-4" /> {pick(locale, "নতুন পণ্য", "Add product")}</Link> : undefined}
      />
      {store?.status === "REJECTED" && store.rejectNote ? <p className="mb-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-danger">{pick(locale, "বাতিলের কারণ:", "Rejected because:")} {store.rejectNote} {pick(locale, "ঠিক করে সেভ করলে আবার অনুমোদনে যাবে।", "Fix it and save to resubmit.")}</p> : null}
      {store?.status === "PENDING" ? <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{pick(locale, "দোকান অনুমোদনের অপেক্ষায়। অনুমোদনের পর পণ্য যোগ করতে পারবেন।", "Your store is waiting for approval. You can add products once it is approved.")}</p> : null}

      {live ? (
        <Section title={pick(locale, "পণ্য", "Products")} className="mb-4">
          {!products.length ? (
            <EmptyState title={pick(locale, "এখনো কোনো পণ্য নেই", "No products yet")} body={pick(locale, "প্রথম পণ্য যোগ করুন: নাম, ছবি, ওজন/সাইজ আর দাম।", "Add your first product: name, photo, weight/size and price.")} href="/worker/store/products/new" action={pick(locale, "নতুন পণ্য", "Add product")} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((p) => {
                const cover = photosOf(p)[0]
                const [lo, hi] = priceRange(p)
                return (
                  <div key={p.id} className={`card flex gap-3 p-3 ${p.active ? "" : "opacity-60"}`}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl(cover)} alt="" className="size-20 shrink-0 rounded-xl object-cover ring-1 ring-line" />
                    ) : <span className="size-20 shrink-0 rounded-xl bg-canvas" aria-hidden />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-ink">{productName(p, locale)}</p>
                      <p className="text-xs text-muted-foreground">{named(locale, p.group)} · {p._count.items} {pick(locale, "বিক্রি", "sold")}</p>
                      <p className="mt-0.5 text-sm font-bold text-ink">{lo === hi ? taka(lo, locale) : `${taka(lo, locale)} – ${taka(hi, locale)}`}</p>
                      <div className="mt-2 flex gap-2">
                        <Link href={`/worker/store/products/${p.id}`} className="btn-soft h-8 px-3 text-xs"><Pencil className="size-3" /> {pick(locale, "এডিট", "Edit")}</Link>
                        <form action={partnerToggleProductAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="btn-ghost h-8 px-3 text-xs">{p.active ? pick(locale, "লুকান", "Hide") : pick(locale, "দেখান", "Show")}</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      ) : null}

      <Section title={store ? pick(locale, "দোকানের তথ্য", "Store details") : pick(locale, "দোকান তৈরি করুন", "Create your store")}>
        <StoreForm locale={locale} store={store ? { id: store.id, name: store.name, nameBn: store.nameBn, address: store.address, addressBn: store.addressBn, detail: store.detail, detailBn: store.detailBn } : null} action={partnerStoreAction} />
      </Section>
    </div>
  )
}
