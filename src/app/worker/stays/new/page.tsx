import { requireUser, getLocale } from "@/lib/auth"
import { activeAreas } from "@/lib/catalog"
import { pick } from "@/lib/i18n"
import { stayCategory } from "@/lib/stays"
import { partnerPropertyAction } from "@/actions/stays"
import { EmptyState, PageHeader } from "@/components/bits"
import { PropertyForm } from "@/components/partner/property-form"

export default async function NewStayPage() {
  const [user, locale] = await Promise.all([requireUser(["WORKER"], "/worker/stays/new"), getLocale()])
  const [category, areas] = user.shopId ? await Promise.all([stayCategory(user.shopId), activeAreas(user.shopId)]) : [null, []]
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back="/worker/stays" title={pick(locale, "নতুন রিসোর্ট / হোটেল", "Add a property")} sub={pick(locale, "অ্যাডমিনের অনুমোদনের পর সাইটে দেখাবে।", "Shows on the site once the admin approves it.")} />
      {!category || !areas.length ? (
        <EmptyState title={pick(locale, "এই শপে রিসোর্ট বুকিং চালু নেই", "This shop has no resort booking")} body={pick(locale, "অফিসকে বলুন রিসোর্ট ক্যাটাগরি চালু করতে।", "Ask the office to enable the stay category.")} />
      ) : (
        <PropertyForm locale={locale} property={null} areas={areas} action={partnerPropertyAction} />
      )}
    </div>
  )
}
