import Link from "next/link"
import { Plus } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { db } from "@/lib/db"
import { officeShop } from "@/lib/shops"
import { photoUrl, photosOf } from "@/lib/vehicles"
import { allProducts, priceRange, productName, shopGroups } from "@/lib/shop"
import { taka } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { saveGroupAction, toggleProductAction } from "@/actions/shop"
import { ActionForm, SubmitButton } from "@/components/forms"
import { EmptyState, PageHeader, Section } from "@/components/bits"

export default async function ProductsPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/products"), getLocale()])
  const shop = await officeShop(user)
  const [products, groups, categories] = await Promise.all([
    allProducts(shop.id),
    shopGroups(shop.id, false),
    db.serviceCategory.findMany({ where: { shopId: shop.id, flow: "SHOP" }, orderBy: { sort: "asc" } }),
  ])
  const live = products.filter((p) => p.active).length
  const catName = (id: string | null) => { const c = categories.find((x) => x.id === id); return c ? named(locale, c) : pick(locale, "সব", "All") }
  return (
    <div className="space-y-6">
      <PageHeader
        title={pick(locale, "প্রোডাক্ট (শুঁটকি ও আচার)", "Products (dried fish & pickles)")}
        sub={pick(locale, `${shop.nameBn} · ${live}টি সাইটে · ${products.length - live}টি লুকানো · ডেলিভারি চার্জ ও ন্যূনতম অর্ডার সেটিংসে · দোকান আলাদা পেজে`, `${shop.name} · ${live} live · ${products.length - live} hidden · delivery and minimum order under Settings · stores on their own page`)}
        action={<Link href="/admin/products/new" className="btn-primary h-10 px-4 text-sm"><Plus className="size-4" /> {pick(locale, "নতুন প্রোডাক্ট", "Add product")}</Link>}
      />
      {!categories.length ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{pick(locale, "এই শপে শুঁটকি/আচার (SHOP) ক্যাটাগরি নেই, তাই কাস্টমার অর্ডার করতে পারবে না।", "This shop has no SHOP category yet, so customers cannot order.")} <Link href="/admin/services" className="font-bold underline">{pick(locale, "সেবা ও দাম", "Services & prices")}</Link></p>
      ) : null}

      <Section title={pick(locale, "শেলফ (পণ্যের গ্রুপ)", "Shelves (product groups)")}>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => <span key={g.id} className="pill bg-canvas text-ink">{named(locale, g)} <span className="text-muted-foreground">· {catName(g.categoryId)} · {products.filter((p) => p.groupId === g.id).length}</span></span>)}
        </div>
        <ActionForm action={saveGroupAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_160px_90px_auto]">
          <input name="nameBn" className="field h-10 text-sm" placeholder={pick(locale, "নতুন শেলফ (বাংলা)", "New shelf (Bangla)")} maxLength={60} />
          <input name="name" className="field h-10 text-sm" placeholder={pick(locale, "নাম (ইংরেজি)", "Name (English)")} required minLength={2} maxLength={60} />
          <select name="categoryId" className="field h-10 text-sm" defaultValue={categories[0]?.id ?? ""}>
            {categories.map((c) => <option key={c.id} value={c.id}>{named(locale, c)}</option>)}
            <option value="">{pick(locale, "দুটোতেই", "Both")}</option>
          </select>
          <input name="sort" type="number" className="field h-10 text-sm" placeholder={pick(locale, "ক্রম", "Sort")} defaultValue={groups.length} min={0} max={999} />
          <SubmitButton className="btn-soft h-10 px-4 text-sm">{pick(locale, "শেলফ যোগ", "Add shelf")}</SubmitButton>
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
                  <p className="truncate text-xs text-muted-foreground">{p.store ? named(locale, p.store) : "HANDYO"} · {named(locale, p.group)}</p>
                  <p className="text-xs text-muted-foreground">{p.variants.filter((v) => v.active).length} {pick(locale, "ভ্যারিয়েন্ট", "variants")} · {p._count.items} {pick(locale, "বিক্রি", "sold")}</p>
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
