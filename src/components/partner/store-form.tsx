import type { Locale } from "@/lib/format"
import { pick } from "@/lib/i18n"
import type { ActionState } from "@/lib/action"
import { ActionForm, SubmitButton } from "@/components/forms"

export type StoreFormValue = { id: string; name: string; nameBn: string; address: string; addressBn: string; detail: string; detailBn: string } | null

/** Store fields shared by the public apply form and the partner's own store page. */
export function StoreFields({ locale, store }: { locale: Locale; store: StoreFormValue }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className="label">{pick(locale, "দোকানের নাম (বাংলা)", "Store name (Bangla)")}</label><input name="nameBn" defaultValue={store?.nameBn} className="field" maxLength={80} placeholder="বিসমিল্লাহ শুঁটকি শপ" /></div>
        <div><label className="label">{pick(locale, "দোকানের নাম (ইংরেজি)", "Store name (English)")}</label><input name="name" defaultValue={store?.name} className="field" required minLength={2} maxLength={80} placeholder="Bismillah Shutki Shop" /></div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className="label">{pick(locale, "ঠিকানা (বাংলা)", "Address (Bangla)")}</label><input name="addressBn" defaultValue={store?.addressBn} className="field" maxLength={200} placeholder="বার্মিজ মার্কেট, কক্সবাজার" /></div>
        <div><label className="label">{pick(locale, "ঠিকানা (ইংরেজি, ঐচ্ছিক)", "Address (English, optional)")}</label><input name="address" defaultValue={store?.address} className="field" maxLength={200} /></div>
      </div>
      <div><label className="label">{pick(locale, "দোকান সম্পর্কে (বাংলা)", "About the store (Bangla)")}</label><textarea name="detailBn" defaultValue={store?.detailBn} className="field" rows={2} maxLength={600} placeholder={pick(locale, "কত বছরের দোকান, কোথাকার শুঁটকি, কীভাবে বানান…", "How old the store is, where the fish comes from, how it's made…")} /></div>
      <div><label className="label">{pick(locale, "দোকান সম্পর্কে (ইংরেজি, ঐচ্ছিক)", "About (English, optional)")}</label><textarea name="detail" defaultValue={store?.detail} className="field" rows={2} maxLength={600} /></div>
      <div>
        <label className="label">{store ? pick(locale, "নতুন লোগো/ছবি (ফাঁকা = আগেরটা থাকবে)", "New logo/photo (blank keeps the old one)") : pick(locale, "দোকানের লোগো বা ছবি (ঐচ্ছিক)", "Store logo or photo (optional)")}</label>
        <input type="file" name="photos" accept="image/*" className="text-xs" />
      </div>
    </>
  )
}

export function StoreForm({ locale, store, action }: { locale: Locale; store: StoreFormValue; action: (prev: ActionState, form: FormData) => Promise<ActionState> }) {
  return (
    <ActionForm action={action} resetOnSuccess={false} className="card space-y-3 p-4 md:p-5">
      {store ? <input type="hidden" name="id" value={store.id} /> : null}
      <StoreFields locale={locale} store={store} />
      <SubmitButton>{store ? pick(locale, "সেভ করুন", "Save") : pick(locale, "দোকান তৈরি করুন", "Create store")}</SubmitButton>
    </ActionForm>
  )
}
