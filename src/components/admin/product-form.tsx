import type { Locale } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { photoUrl } from "@/lib/vehicles"
import { saveProductAction } from "@/actions/shop"
import { ActionForm, SubmitButton } from "@/components/forms"

type Product = {
  id: string
  groupId: string
  name: string
  nameBn: string
  slug: string
  badge: string
  detail: string
  detailBn: string
  photos: string
  sort: number
  active: boolean
  storeId?: string | null
  /** Variants as lines: label | price | old price | stock */
  variants: string
} | null

export function ProductForm({ locale, product, groups, stores, action = saveProductAction }: { locale: Locale; product: Product; groups: Array<{ id: string; name: string; nameBn: string }>; stores?: Array<{ id: string; name: string; nameBn: string }>; action?: typeof saveProductAction }) {
  const photos = product ? product.photos.split(",").map((p) => p.trim()).filter(Boolean) : []
  return (
    <ActionForm action={action} resetOnSuccess={false} className="grid gap-4 lg:grid-cols-[1fr_340px]">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="card space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="groupId">{pick(locale, "গ্রুপ", "Group")}</label>
            <select id="groupId" name="groupId" defaultValue={product?.groupId ?? groups[0]?.id} className="field" required>
              {groups.map((g) => <option key={g.id} value={g.id}>{named(locale, g)}</option>)}
            </select>
          </div>
          {stores ? (
            <div><label className="label" htmlFor="storeId">{pick(locale, "দোকান", "Store")}</label>
              <select id="storeId" name="storeId" defaultValue={product?.storeId ?? ""} className="field">
                <option value="">{pick(locale, "HANDYO-র নিজের", "HANDYO's own")}</option>
                {stores.map((st) => <option key={st.id} value={st.id}>{named(locale, st)}</option>)}
              </select>
            </div>
          ) : null}
          <div><label className="label" htmlFor="badge">{pick(locale, "ব্যাজ (ঐচ্ছিক)", "Badge (optional)")}</label><input id="badge" name="badge" defaultValue={product?.badge} className="field" maxLength={30} placeholder={pick(locale, "সেরা পছন্দ / নতুন", "Best seller / New")} /></div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="nameBn">{pick(locale, "নাম (বাংলা)", "Name (Bangla)")}</label><input id="nameBn" name="nameBn" defaultValue={product?.nameBn} className="field" maxLength={100} placeholder="লইট্টা শুঁটকি" /></div>
          <div><label className="label" htmlFor="name">{pick(locale, "নাম (ইংরেজি)", "Name (English)")}</label><input id="name" name="name" defaultValue={product?.name} className="field" required minLength={2} maxLength={100} placeholder="Loitta dried fish" /></div>
        </div>
        <div>
          <label className="label" htmlFor="variants">{pick(locale, "ভ্যারিয়েন্ট ও দাম (প্রতি লাইনে একটা)", "Variants & prices (one per line)")}</label>
          <textarea id="variants" name="variants" defaultValue={product?.variants} className="field min-h-24 font-mono text-xs" required maxLength={2000} placeholder={"২৫০ গ্রাম | 450\n৫০০ গ্রাম | 850 | 900\n১ কেজি | 1600 | 1700 | 20"} />
          <p className="mt-1 text-xs text-muted-foreground">{pick(locale, "ফরম্যাট: লেবেল | দাম | আগের দাম (ঐচ্ছিক, কাটা দাম দেখায়) | স্টক (ফাঁকা = সীমাহীন)।", "Format: label | price | old price (optional, shown struck through) | stock (blank = unlimited).")}</p>
        </div>
        <div><label className="label" htmlFor="detailBn">{pick(locale, "বিবরণ (বাংলা)", "Description (Bangla)")}</label><textarea id="detailBn" name="detailBn" defaultValue={product?.detailBn} className="field" rows={3} maxLength={1000} placeholder={pick(locale, "কোথাকার, কীভাবে বানানো, কতদিন ভালো থাকে…", "Origin, how it's made, shelf life…")} /></div>
        <div><label className="label" htmlFor="detail">{pick(locale, "বিবরণ (ইংরেজি, ঐচ্ছিক)", "Description (English, optional)")}</label><textarea id="detail" name="detail" defaultValue={product?.detail} className="field" rows={2} maxLength={1000} /></div>
      </div>
      <div className="space-y-4">
        <div className="card space-y-3 p-4">
          <div>
            <label className="label" htmlFor="photos">{pick(locale, "ছবি (সর্বোচ্চ ৪টা, প্রথমটা কভার)", "Photos (up to 4, first is the cover)")}</label>
            <input id="photos" name="photos" type="file" accept="image/*" multiple className="text-xs" />
            {photos.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p} src={photoUrl(p)} alt="" className="size-16 rounded-lg object-cover ring-1 ring-line" />
                ))}
              </div>
            ) : null}
            {product ? <p className="mt-1 text-xs text-muted-foreground">{pick(locale, "নতুন ছবি দিলে আগেরগুলো বদলে যাবে।", "New photos replace the old ones.")}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="sort">{pick(locale, "ক্রম", "Sort")}</label><input id="sort" name="sort" type="number" min={0} max={999} defaultValue={product?.sort ?? 0} className="field" /></div>
            <div><label className="label" htmlFor="slug">{pick(locale, "লিংক স্লাগ (ঐচ্ছিক)", "URL slug (optional)")}</label><input id="slug" name="slug" defaultValue={product?.slug} className="field" maxLength={80} placeholder="loitta-shutki" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-ink"><input type="checkbox" name="active" defaultChecked={product ? product.active : true} className="size-4 accent-[var(--brand)]" /> {pick(locale, "সাইটে দেখাও", "Show on the site")}</label>
        </div>
        <SubmitButton>{product ? pick(locale, "সেভ করুন", "Save") : pick(locale, "প্রোডাক্ট যোগ করুন", "Add product")}</SubmitButton>
      </div>
    </ActionForm>
  )
}
