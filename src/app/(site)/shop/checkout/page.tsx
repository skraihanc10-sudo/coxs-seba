import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getLocale, getUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { currentShop } from "@/lib/shops"
import { getSettings } from "@/lib/settings"
import { enabledProviders } from "@/lib/payments"
import { pick } from "@/lib/i18n"
import { homeFor } from "@/lib/roles"
import { privateMeta } from "@/lib/seo"
import { laundryRules, shopCategory, shopRules } from "@/lib/shop"
import { EmptyState, PageHeader } from "@/components/bits"
import { ShopCheckout } from "@/components/shop-checkout"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return privateMeta(pick(locale, "অর্ডার নিশ্চিত করুন", "Checkout"))
}

export default async function CheckoutPage() {
  const [locale, user, shop] = await Promise.all([getLocale(), getUser(), currentShop()])
  if (user && user.role !== "CUSTOMER") redirect(homeFor(user.role))
  const [settings, category] = await Promise.all([getSettings(shop.id), shopCategory(shop.id)])
  const address = user ? await db.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }) : null
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader back="/services/shutki" title={pick(locale, "অর্ডার নিশ্চিত করুন", "Checkout")} sub={pick(locale, "কার্ট দেখুন, ডেলিভারি তথ্য দিন, অর্ডার করুন।", "Review your cart, add delivery details, order.")} />
      {!category ? (
        <EmptyState title={pick(locale, "এই শাখায় শপ চালু নেই", "This branch has no shop")} />
      ) : (
        <ShopCheckout
          locale={locale}
          categoryId={category.id}
          rules={shopRules(settings)}
          laundryRules={laundryRules(settings)}
          payments={enabledProviders(settings).map((x) => ({ id: x.id, label: x.label, labelBn: x.labelBn, hint: x.hint, hintBn: x.hintBn }))}
          user={user ? { name: user.name, phone: user.phone ?? "", address: address ? `${address.line}${address.landmark ? `, ${address.landmark}` : ""}` : "" } : null}
          shopHref="/services/shutki"
        />
      )}
    </div>
  )
}
