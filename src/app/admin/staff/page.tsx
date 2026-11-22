import { requireUser, getLocale } from "@/lib/auth"
import { db } from "@/lib/db"
import { pick } from "@/lib/i18n"
import { ROLE_LABEL, ADMINS } from "@/lib/roles"
import { allShops, officeShop } from "@/lib/shops"
import { resetPasswordAction, saveStaffAction, toggleUserAction } from "@/actions/admin"
import { ActionForm, SubmitButton } from "@/components/forms"
import { PageHeader, Section } from "@/components/bits"

export default async function StaffPage() {
  const [me, locale] = await Promise.all([requireUser(ADMINS, "/admin/staff"), getLocale()])
  const shop = await officeShop(me)
  const owner = me.role === "OWNER"
  const [staff, owners, shops] = await Promise.all([
    db.user.findMany({ where: { role: { in: ["ADMIN", "SUPPORT"] }, shopId: shop.id }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    owner ? db.user.findMany({ where: { role: "OWNER" }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    owner ? allShops() : Promise.resolve([]),
  ])
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div>
        <PageHeader
          title={`${pick(locale, "স্টাফ", "Staff")} · ${pick(locale, shop.nameBn, shop.name)}`}
          sub={pick(locale, "এই শপের অ্যাডমিন (সব অধিকার) আর সাপোর্ট (ইনবক্স, বুকিং, কর্মী assign)। অন্য শপের স্টাফ এখানে দেখা যায় না।", "This shop's admins (everything) and support agents (inbox, bookings, assigning). Staff of other shops are not listed here.")}
        />
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className={`card flex flex-wrap items-center gap-3 p-4 ${s.active ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-ink">{s.name} <span className="pill ml-1 bg-brand-soft text-brand">{ROLE_LABEL[s.role]?.[locale]}</span></p>
                <p className="text-xs text-muted-foreground">{s.email} {s.phone ? `· ${s.phone}` : ""}</p>
              </div>
              <ActionForm action={resetPasswordAction} className="flex gap-2">
                <input type="hidden" name="id" value={s.id} />
                <input name="password" type="password" className="field h-9 w-40 text-sm" placeholder={pick(locale, "নতুন পাসওয়ার্ড", "New password")} minLength={6} required />
                <SubmitButton className="btn-soft h-9 px-3 text-xs">{pick(locale, "সেট", "Set")}</SubmitButton>
              </ActionForm>
              {s.id !== me.id ? <form action={toggleUserAction}><input type="hidden" name="id" value={s.id} /><button className="text-xs font-bold text-muted-foreground hover:text-ink">{s.active ? pick(locale, "নিষ্ক্রিয়", "Deactivate") : pick(locale, "সক্রিয়", "Activate")}</button></form> : null}
            </div>
          ))}
          {!staff.length ? <p className="card p-4 text-sm text-muted-foreground">{pick(locale, "এই শপে এখনো কোনো স্টাফ নেই। ডান পাশের ফর্ম থেকে যোগ করুন।", "No staff in this shop yet. Add one with the form.")}</p> : null}
        </div>

        {owner ? (
          <Section title={pick(locale, "মালিক অ্যাকাউন্ট (সব শপ)", "Owner accounts (all shops)")} className="mt-6">
            <ul className="divide-y divide-line text-sm">
              {owners.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-2">
                  <span className="flex-1 font-bold text-ink">{o.name}{o.id === me.id ? <span className="ml-1 text-xs text-muted-foreground">({pick(locale, "আপনি", "you")})</span> : null}</span>
                  <span className="text-xs text-muted-foreground">{o.email}</span>
                  <span className={`pill ${o.active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>{o.active ? pick(locale, "সক্রিয়", "Active") : pick(locale, "বন্ধ", "Off")}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{pick(locale, "মালিক অ্যাকাউন্ট এখান থেকে বদলানো যায় না।", "Owner accounts are read-only here.")}</p>
          </Section>
        ) : null}
      </div>
      <Section title={pick(locale, "নতুন স্টাফ", "New staff")}>
        <ActionForm action={saveStaffAction} className="space-y-2">
          <input name="name" className="field" placeholder={pick(locale, "নাম", "Name")} required />
          <input name="email" type="email" className="field" placeholder="email@…" required />
          <input name="phone" className="field" placeholder={pick(locale, "মোবাইল (ঐচ্ছিক)", "Mobile (optional)")} />
          <input name="password" type="password" className="field" placeholder={pick(locale, "পাসওয়ার্ড", "Password")} minLength={6} required autoComplete="new-password" />
          <select name="role" className="field" defaultValue="SUPPORT"><option value="SUPPORT">{ROLE_LABEL.SUPPORT[locale]}</option><option value="ADMIN">{ROLE_LABEL.ADMIN[locale]}</option></select>
          {owner ? (
            <div>
              <label className="label" htmlFor="staff-shop">{pick(locale, "কোন শপের স্টাফ", "Which shop")}</label>
              <select id="staff-shop" name="shopId" className="field" defaultValue={shop.id}>
                {shops.map((s) => <option key={s.id} value={s.id}>{pick(locale, s.nameBn, s.name)}</option>)}
              </select>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{pick(locale, `${shop.nameBn} শপের স্টাফ হবেন।`, `Will belong to ${shop.name}.`)}</p>
          )}
          <SubmitButton>{pick(locale, "অ্যাকাউন্ট তৈরি", "Create account")}</SubmitButton>
        </ActionForm>
      </Section>
    </div>
  )
}
