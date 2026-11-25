import Link from "next/link"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { decidedRequests, pendingHelpers, pendingRequests, REQUEST_KIND_TEXT } from "@/lib/partners"
import { formatWhen, taka } from "@/lib/format"
import { named, pick } from "@/lib/i18n"
import { decideRequestAction, reviewHelperAction } from "@/actions/partners"
import { EmptyState, PageHeader, Section, StatusPill } from "@/components/bits"
import { ActionForm, SubmitButton } from "@/components/forms"

/**
 * The office's approval queue: extra charges partners want on a bill,
 * cancellations asked by customers or partners, and new helper accounts.
 */
export default async function ApprovalsPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/approvals"), getLocale()])
  const shop = await officeShop(user)
  const scope = user.role === "OWNER" ? null : shop.id
  const [pending, helpers, history] = await Promise.all([pendingRequests(scope), pendingHelpers(scope), decidedRequests(scope, 30)])
  const bn = locale === "bn"
  return (
    <div className="space-y-6">
      <PageHeader title={pick(locale, "অনুমোদন", "Approvals")} sub={pick(locale, `${pending.length}টা অনুরোধ · ${helpers.length} জন হেল্পার অপেক্ষায়`, `${pending.length} requests · ${helpers.length} helpers waiting`)} />

      <Section title={pick(locale, "অর্ডারে অনুরোধ", "Order requests")}>
        {!pending.length ? <EmptyState title={pick(locale, "কোনো অনুরোধ নেই", "Nothing waiting")} body={pick(locale, "পার্টনার এক্সট্রা চার্জ চাইলে বা কেউ বাতিল চাইলে এখানে আসবে।", "Extra-charge and cancellation requests land here.")} /> : (
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className={`pill ${r.kind === "CANCEL" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>{bn ? REQUEST_KIND_TEXT[r.kind]?.bn : REQUEST_KIND_TEXT[r.kind]?.en}</span>
                      <Link href={`/admin/bookings/${r.booking.code}`} className="font-extrabold text-brand">{r.booking.code}</Link>
                      <span className="text-sm text-ink">{named(locale, r.booking.offering)}</span>
                      <StatusPill status={r.booking.status} locale={locale} flow={r.booking.category.flow} />
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pick(locale, "চেয়েছেন:", "By:")} <span className="font-bold text-ink">{r.requester.name}</span> ({r.requesterRole === "CUSTOMER" ? pick(locale, "কাস্টমার", "customer") : pick(locale, "পার্টনার", "partner")}) · {formatWhen(r.createdAt, locale)}
                      {r.booking.store ? ` · ${named(locale, r.booking.store)}` : ""}
                    </p>
                    {r.kind === "EXTRA" ? <p className="mt-1 text-sm">{pick(locale, "এক্সট্রা:", "Extra:")} <span className="font-extrabold text-ink">+{taka(r.amount, locale)}</span> <span className="text-muted-foreground">({pick(locale, "এখন বিল", "bill now")} {taka(r.booking.finalPrice ?? r.booking.estimatedPrice + r.booking.extraCharge, locale)})</span></p> : null}
                    <p className="mt-1 text-sm text-ink">“{r.note}”</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionForm action={decideRequestAction} resetOnSuccess={false} className="inline">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="decision" value="APPROVE" />
                    <SubmitButton className="btn-primary h-10 px-4 text-sm">{r.kind === "CANCEL" ? pick(locale, "বাতিল অনুমোদন", "Approve cancel") : pick(locale, "বিলে যোগ করুন", "Add to bill")}</SubmitButton>
                  </ActionForm>
                  <ActionForm action={decideRequestAction} resetOnSuccess={false} className="flex flex-1 gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="decision" value="REJECT" />
                    <input name="note" className="field h-10 flex-1 text-sm" placeholder={pick(locale, "নাকচের কারণ", "Reason to reject")} required minLength={2} maxLength={200} />
                    <SubmitButton className="btn-soft h-10 shrink-0 px-4 text-sm">{pick(locale, "নাকচ", "Reject")}</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={pick(locale, "হেল্পার অ্যাকাউন্ট", "Helper accounts")}>
        {!helpers.length ? <p className="py-4 text-sm text-muted-foreground">{pick(locale, "অনুমোদনের অপেক্ষায় কোনো হেল্পার নেই। প্রতি পার্টনার সর্বোচ্চ ২ জন হেল্পার রাখতে পারে।", "No helpers waiting. Each partner may have up to 2 helpers.")}</p> : (
          <ul className="divide-y divide-line">
            {helpers.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink">{h.name} <span className="text-sm font-normal text-muted-foreground">· {h.phone}</span></p>
                  <p className="text-xs text-muted-foreground">{pick(locale, "পার্টনার:", "Partner:")} {h.helperOf?.user.name} · {formatWhen(h.createdAt, locale)}</p>
                </div>
                <ActionForm action={reviewHelperAction} resetOnSuccess={false} className="inline"><input type="hidden" name="id" value={h.id} /><input type="hidden" name="decision" value="APPROVE" /><SubmitButton className="btn-primary h-9 px-3 text-sm">{pick(locale, "অনুমোদন", "Approve")}</SubmitButton></ActionForm>
                <ActionForm action={reviewHelperAction} resetOnSuccess={false} className="inline"><input type="hidden" name="id" value={h.id} /><input type="hidden" name="decision" value="REJECT" /><SubmitButton className="btn-soft h-9 px-3 text-sm">{pick(locale, "নাকচ", "Reject")}</SubmitButton></ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {history.length ? (
        <Section title={pick(locale, "আগের সিদ্ধান্ত", "Recent decisions")}>
          <ul className="divide-y divide-line text-sm">
            {history.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className={`pill ${r.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-canvas text-muted-foreground"}`}>{r.status === "APPROVED" ? pick(locale, "অনুমোদিত", "Approved") : pick(locale, "নাকচ", "Rejected")}</span>
                <Link href={`/admin/bookings/${r.booking.code}`} className="font-bold text-brand">{r.booking.code}</Link>
                <span>{bn ? REQUEST_KIND_TEXT[r.kind]?.bn : REQUEST_KIND_TEXT[r.kind]?.en}{r.kind === "EXTRA" ? ` ${taka(r.amount, locale)}` : ""}</span>
                <span className="text-muted-foreground">· {r.requester.name}{r.decider ? ` → ${r.decider.name}` : ""}{r.decisionNote ? ` · ${r.decisionNote}` : ""}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  )
}
