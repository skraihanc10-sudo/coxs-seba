import Link from "next/link"
import { Plus } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { photoUrl, photosOf } from "@/lib/vehicles"
import { allProducts, priceRange, productName, shopCategory, shopGroups } from "@/lib/shop"
import { taka } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { saveGroupAction, toggleProductAction } from "@/actions/shop"
import { ActionForm, SubmitButton } from "@/components/forms"
import { EmptyState, PageHeader, Section } from "@/components/bits"

export default async function ProductsPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/products"), getLocale()])
  const shop = await officeShop(user)
  const [products, groups, category] = await Promise.all([allProducts(shop.id), shopGroups(shop.id, false), shopCategory(shop.id)])
  const live = products.filter((p) => p.active).length
  return (
    <div className="space-y-6">
      <PageHeader
        title={pick(locale, "প্রোডাক্ট (শুঁটকি ও আচার শপ)", "Products (dried fish & pickle shop)")}
        sub={pick(locale, `${shop.nameBn} · ${live}টি সাইটে · ${products.length - live}টি লুকানো · ডেলিভারি চার্জ ও ন্যূনতম অর্ডার সেটিংসে`, `${shop.name} · ${live} live · ${products.length - live} hidden · delivery charge and minimum order under Settings`)}
        action={<Link href="/admin/products/new" className="btn-primary h-10 px-4 text-sm"><Plus className="size-4" /> {pick(locale, "নতুন প্রোডাক্ট", "Add product")}</Link>}
      />
      {!category ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pick(locale, "এই শপে এখনো শপ (SHOP) ক্যাটাগরি নেই, তাই কাস্টমার অর্ডার করতে পারবে না।", "This shop has no SHOP category yet, so customers cannot order.")}{" "}
          <Link href="/admin/services" className="font-bold underline">{pick(locale, "সেবা ও দাম পেজে যোগ করুন", "Add one on Services & prices")}</Link>
        </p>
      ) : null}

      <Section title={pick(locale, "গ্রুপ", "Groups")}>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => <span key={g.id} className="pill bg-canvas text-ink">{named(locale, g)} <span className="text-muted-foreground">({products.filter((p) => p.groupId === g.id).length})</span></span>)}
        </div>
        <ActionForm action={saveGroupAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_100px_auto]">
          <input name="nameBn" className="field h-10 text-sm" placeholder={pick(locale, "নতুন গ্রুপ (বাংলা)", "New group (Bangla)")} maxLength={60} />
          <input name="name" className="field h-10 text-sm" placeholder={pick(locale, "নাম (ইংরেজি)", "Name (English)")} required minLength={2} maxLength={60} />
          <input name="sort" type="number" className="field h-10 text-sm" placeholder={pick(locale, "ক্রম", "Sort")} defaultValue={groups.length} min={0} max={999} />
          <SubmitButton className="btn-soft h-10 px-4 text-sm">{pick(locale, "গ্রুপ যোগ", "Add group")}</SubmitButton>
        </ActionForm>
      </Section>

      {!products.length ? (
        <EmptyState title={pick(locale, "এখনো কোনো প্রোডাক্ট নেই", "No products yet")} body={pick(locale, "প্রথম প্রোডাক্ট যোগ করুন: নাম, ছবি, সাইজ/ওজন আর দাম।", "Add your first product: name, photo, sizes and prices.")} href="/admin/products/new" action={pick(locale, "নতুন প্রোডাক্ট", "Add product")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  <Link href={`/admin/products/${p.id}`} className="block truncate font-extrabold text-ink hover:text-brand">{productName(p, locale)}</Link>
                  <p className="text-xs text-muted-foreground">{named(locale, p.group)} · {p.variants.filter((v) => v.active).length} {pick(locale, "ভ্যারিয়েন্ট", "variants")} · {p._count.items} {pick(locale, "বিক্রি", "sold")}</p>
                  <p className="mt-0.5 text-sm font-bold text-ink">{lo === hi ? taka(lo, locale) : `${taka(lo, locale)} – ${taka(hi, locale)}`}</p>
                  <div className="mt-2 flex gap-2">
                    <Link href={`/admin/products/${p.id}`} className="btn-soft h-8 px-3 text-xs">{pick(locale, "এডিট", "Edit")}</Link>
                    <form action={toggleProductAction}>
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
    </div>
  )
}
