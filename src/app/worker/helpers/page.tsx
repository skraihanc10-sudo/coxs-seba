import { requireUser, getLocale } from "@/lib/auth"
import { MAX_HELPERS, partnerHelpers } from "@/lib/partners"
import { pick } from "@/lib/i18n"
import { addHelperAction, reviewHelperAction } from "@/actions/partners"
import { EmptyState, PageHeader, Section } from "@/components/bits"
import { ActionForm, SubmitButton } from "@/components/forms"

/** A partner's helpers: up to two accounts that work inside this panel once the HANDYO office approves them. */
export default async function HelpersPage() {
  const [user, locale] = await Promise.all([requireUser(["WORKER"], "/worker/helpers"), getLocale()])
  const partner = user.worker?.kind === "PARTNER" && !user.isHelper
  if (!partner || !user.worker) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={pick(locale, "হেল্পার", "Helpers")} />
        <EmptyState title={pick(locale, "শুধু দোকান/গাড়ি/রিসোর্টের মালিক হেল্পার যোগ করতে পারেন", "Only the partner owner manages helpers")} />
      </div>
    )
  }
  const helpers = await partnerHelpers(user.worker.id)
  const used = helpers.filter((h) => h.helperStatus !== "REJECTED").length
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={pick(locale, "হেল্পার", "Helpers")} sub={pick(locale, `${used}/${MAX_HELPERS} জন · আপনার প্যানেলে অর্ডার আর পণ্য সামলাতে পারবে`, `${used}/${MAX_HELPERS} · they handle orders and products inside your panel`)} />
      <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{pick(locale, "হেল্পার আপনার দোকানের অর্ডার, পণ্য আর চ্যাট দেখবে; হিসাব আর হেল্পার যোগ করা শুধু আপনি। নতুন হেল্পার HANDYO অফিস অনুমোদন দিলে লগইন করতে পারবে।", "Helpers see your orders, products and chat; the ledger and helper management stay with you. A new helper can sign in once the HANDYO office approves them.")}</p>
      <Section title={pick(locale, "আপনার হেল্পার", "Your helpers")}>
        {!helpers.length ? <p className="py-3 text-sm text-muted-foreground">{pick(locale, "এখনো কেউ নেই।", "None yet.")}</p> : (
          <ul className="divide-y divide-line">
            {helpers.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1"><span className="font-bold text-ink">{h.name}</span> <span className="text-muted-foreground">· {h.phone}</span></span>
                <span className={`pill ${h.helperStatus === "APPROVED" ? "bg-emerald-100 text-emerald-800" : h.helperStatus === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-canvas text-muted-foreground"}`}>{h.helperStatus === "APPROVED" ? pick(locale, "চালু", "active") : h.helperStatus === "PENDING" ? pick(locale, "অফিসের অনুমোদনের অপেক্ষায়", "waiting for office approval") : pick(locale, "নাকচ", "rejected")}</span>
                <ActionForm action={reviewHelperAction} resetOnSuccess={false} className="inline"><input type="hidden" name="id" value={h.id} /><input type="hidden" name="decision" value="REMOVE" /><SubmitButton className="btn-soft h-8 px-3 text-xs">{pick(locale, "সরান", "Remove")}</SubmitButton></ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {used < MAX_HELPERS ? (
        <Section title={pick(locale, "নতুন হেল্পার", "Add a helper")}>
          <ActionForm action={addHelperAction} className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="hname">{pick(locale, "নাম", "Name")}</label><input id="hname" name="name" className="field" required minLength={2} maxLength={80} /></div>
            <div><label className="label" htmlFor="hphone">{pick(locale, "মোবাইল", "Mobile")}</label><input id="hphone" name="phone" inputMode="tel" className="field" placeholder="01XXXXXXXXX" required /></div>
            <div><label className="label" htmlFor="hpass">{pick(locale, "পাসওয়ার্ড", "Password")}</label><input id="hpass" name="password" type="password" className="field" required minLength={6} /></div>
            <SubmitButton className="btn-primary sm:col-span-3">{pick(locale, "হেল্পার যোগ করুন (অফিস অনুমোদন দেবে)", "Add helper (office approves)")}</SubmitButton>
          </ActionForm>
        </Section>
      ) : null}
    </div>
  )
}
