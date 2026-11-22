import type { Metadata } from "next"
import { requireUser, getLocale } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { currentShop } from "@/lib/shops"
import { myCareThread } from "@/lib/support"
import { pick, words } from "@/lib/i18n"
import { privateMeta } from "@/lib/seo"
import { sendCareMessageAction } from "@/actions/support"
import { PageHeader } from "@/components/bits"
import { Composer, MessageList } from "@/components/chat-pane"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return privateMeta(words(locale).care)
}

export default async function CarePage() {
  const [user, locale, shop] = await Promise.all([requireUser(["CUSTOMER"], "/care"), getLocale(), currentShop()])
  const [settings, thread] = await Promise.all([getSettings(shop.id), myCareThread(user.id, shop.id)])
  const t = words(locale)
  const bn = locale === "bn"
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back="/help" title={t.care} sub={pick(locale, `${shop.nameBn} · ${settings.officeHours} · সাধারণত কয়েক মিনিটে উত্তর দিই`, `${shop.name} · ${settings.officeHoursEn} · we usually reply within minutes`)} />
      <div className="card p-4">
        <MessageList messages={thread.messages} me={user.id} locale={locale} empty={pick(locale, `আসসালামু আলাইকুম! ${shop.cityBn} টিমকে কী জানতে চান লিখুন, আমরা উত্তর দিচ্ছি।`, `Hello! Ask the ${shop.city} team anything and we'll reply here.`)} />
        <Composer action={sendCareMessageAction} fields={{}} placeholder={pick(locale, "বার্তা লিখুন…", "Write a message…")} />
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">{bn ? "অন্য শাখার সাথে কথা বলতে উপরে শাখা বদলান।" : "Switch the branch in the header to talk to another branch."}</p>
    </div>
  )
}
