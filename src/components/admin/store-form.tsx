import type { Locale } from "@/lib/format"
import { pick } from "@/lib/i18n"
import { photoUrl } from "@/lib/vehicles"
import { saveStoreAction } from "@/actions/shop"
import { ActionForm, SubmitButton } from "@/components/forms"
import { StoreFields, type StoreFormValue } from "@/components/partner/store-form"

type Worker = { id: string; kind: string; autoAssign: boolean; user: { name: string; phone: string | null } }

/** Admin creates a HANDYO-managed store or edits any store: owner, sort, logo. */
export function AdminStoreForm({ locale, store, workers }: { locale: Locale; store: (NonNullable<StoreFormValue> & { workerId: string | null; sort: number; photos: string }) | null; workers: Worker[] }) {
  const cover = store?.photos.split(",")[0]?.trim()
  return (
    <ActionForm action={saveStoreAction} resetOnSuccess={false} className="grid gap-4 lg:grid-cols-[1fr_340px]">
      {store ? <input type="hidden" name="id" value={store.id} /> : null}
      <div className="card space-y-3 p-4">
        <StoreFields locale={locale} store={store} />
      </div>
      <div className="space-y-4">
        <div className="card space-y-3 p-4">
          <div>
            <label className="label" htmlFor="workerId">{pick(locale, "মালিক (ঐচ্ছিক, ফাঁকা = HANDYO-র নিজের)", "Owner (optional, blank = HANDYO's own)")}</label>
            <select id="workerId" name="workerId" defaultValue={store?.workerId ?? ""} className="field">
              <option value="">{pick(locale, "HANDYO-র নিজের দোকান", "HANDYO's own store")}</option>
              {workers.map((w) => <option key={w.id} value={w.id}>{w.user.name}{w.user.phone ? ` · ${w.user.phone}` : ""}{w.kind === "PARTNER" ? ` · ${pick(locale, "পার্টনার", "partner")}` : ""}{w.autoAssign ? ` · ${pick(locale, "সরাসরি", "direct")}` : ""}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">{pick(locale, "মালিক দিলে তার পার্সেল তার প্যানেলে পাঠানো যাবে। “সরাসরি” সুইচ কর্মীর পেজে।", "With an owner set, their parcels can be sent to their panel. The “direct” switch is on the worker's page.")}</p>
          </div>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl(cover)} alt="" className="size-20 rounded-xl object-cover ring-1 ring-line" />
          ) : null}
          <div><label className="label" htmlFor="sort">{pick(locale, "ক্রম (ছোট সংখ্যা আগে)", "Sort (lower first)")}</label><input id="sort" name="sort" type="number" min={0} max={999} defaultValue={store?.sort ?? 0} className="field w-32" /></div>
        </div>
        <SubmitButton>{store ? pick(locale, "সেভ করুন", "Save") : pick(locale, "দোকান তৈরি করুন", "Create store")}</SubmitButton>
      </div>
    </ActionForm>
  )
}
