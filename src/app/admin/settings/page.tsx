import { Trash2 } from "lucide-react"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { db } from "@/lib/db"
import { getSettings } from "@/lib/settings"
import { PAYMENT_PROVIDERS, gatewayReady } from "@/lib/payments"
import { smsProvider } from "@/lib/sms"
import { pick } from "@/lib/i18n"
import { deleteFaqAction, saveFaqAction, saveSettingsAction } from "@/actions/admin"
import { ActionForm, SubmitButton } from "@/components/forms"
import { PageHeader, Section } from "@/components/bits"

export default async function SettingsPage() {
  const [user, locale] = await Promise.all([requireUser(ADMINS, "/admin/settings"), getLocale()])
  const shop = await officeShop(user)
  const [s, faqs] = await Promise.all([getSettings(shop.id), db.faq.findMany({ orderBy: { sort: "asc" } })])
  const sms = smsProvider()
  return (
    <div className="space-y-4">
      <PageHeader title={pick(locale, "সেটিংস", "Settings")} sub={pick(locale, `এই সেটিংস শুধু ${shop.nameBn} শপের।`, `These settings apply to ${shop.name} only.`)} />
      <ActionForm action={saveSettingsAction} resetOnSuccess={false} className="grid gap-4 lg:grid-cols-2">
        <Section title={pick(locale, "যোগাযোগ", "Contact")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field k="helpline" label={pick(locale, "হেল্পলাইন নম্বর", "Helpline number")} value={s.helpline} />
            <Field k="whatsapp" label={pick(locale, "হোয়াটসঅ্যাপ নম্বর", "WhatsApp number")} value={s.whatsapp} />
            <Field k="emergency" label={pick(locale, "ইমার্জেন্সি নম্বর", "Emergency number")} value={s.emergency} />
            <Field k="supportEmail" label={pick(locale, "সাপোর্ট ইমেইল", "Support email")} type="email" value={s.supportEmail} />
            <Field k="officeHours" label={pick(locale, "অফিসের সময় (বাংলা)", "Office hours (Bangla)")} value={s.officeHours} />
            <Field k="officeHoursEn" label={pick(locale, "অফিসের সময় (ইংরেজি)", "Office hours (English)")} value={s.officeHoursEn} />
            <Field k="address" label={pick(locale, "ঠিকানা (বাংলা)", "Address (Bangla)")} value={s.address} />
            <Field k="addressEn" label={pick(locale, "ঠিকানা (ইংরেজি)", "Address (English)")} value={s.addressEn} />
          </div>
        </Section>
        <Section title={pick(locale, "হোমপেজ ও টাকা", "Homepage & money")}>
          <div className="grid gap-3">
            <Field k="heroBn" label={pick(locale, "হোমপেজ শিরোনাম (বাংলা)", "Homepage headline (Bangla)")} value={s.heroBn} />
            <Field k="heroEn" label={pick(locale, "হোমপেজ শিরোনাম (ইংরেজি)", "Homepage headline (English)")} value={s.heroEn} />
            <div><label className="label" htmlFor="bannerBn">{pick(locale, "হোমপেজ ব্যানার (বাংলা)", "Homepage banner (Bangla)")}</label><textarea id="bannerBn" name="bannerBn" defaultValue={s.bannerBn} className="field min-h-20" /></div>
            <div><label className="label" htmlFor="bannerEn">{pick(locale, "হোমপেজ ব্যানার (ইংরেজি)", "Homepage banner (English)")}</label><textarea id="bannerEn" name="bannerEn" defaultValue={s.bannerEn} className="field min-h-20" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field k="workerShare" label={pick(locale, "কর্মীর ভাগ (% of job)", "Worker share (% of job)")} type="number" value={s.workerShare} />
              <Field k="partnerShare" label={pick(locale, "পার্টনারের ভাগ (ভাড়ার %)", "Partner share (% of rental)")} type="number" value={s.partnerShare} />
            </div>
            <div>
              <p className="label">{pick(locale, "পেমেন্টের ধরন", "Payment methods")}</p>
              <div className="flex flex-wrap gap-3">
                {PAYMENT_PROVIDERS.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name={p.setting} defaultChecked={s[p.setting] !== "0"} className="size-4 accent-[var(--brand)]" /> {locale === "bn" ? p.labelBn : p.label}{p.env.length ? <span className={`pill ${gatewayReady(p) ? "bg-emerald-100 text-emerald-800" : "bg-canvas text-muted-foreground"}`}>{gatewayReady(p) ? pick(locale, "গেটওয়ে চালু", "gateway live") : pick(locale, "শুধু রেকর্ড", "record only")}</span> : null}</label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{pick(locale, `SMS: ${sms.live ? "লাইভ" : "ডেমো (OTP 123456)"} · আসল SMS চালু করতে .env-এ SMS_PROVIDER আর key বসান।`, `SMS: ${sms.live ? "live" : "demo (OTP 123456)"} · set SMS_PROVIDER and keys in .env to go live.`)}</p>
            </div>
          </div>
          <SubmitButton className="btn-primary mt-4 w-full">{pick(locale, "সেটিংস সেভ", "Save settings")}</SubmitButton>
        </Section>
      </ActionForm>

      <Section title={pick(locale, "সাধারণ প্রশ্ন (FAQ) · সব শপের জন্য এক", "FAQ · shared by all shops")}>
        <p className="mb-3 text-xs text-muted-foreground">{pick(locale, "FAQ সব শপে একই দেখায়; এখানে বদলালে সব শপে বদলে যাবে।", "FAQs are global: a change here shows on every shop.")}</p>
        <div className="space-y-2">
          {faqs.map((f) => (
            <details key={f.id} className="rounded-xl bg-canvas p-3">
              <summary className="cursor-pointer list-none text-sm font-bold text-ink">{f.questionBn}</summary>
              <ActionForm action={saveFaqAction} resetOnSuccess={false} className="mt-2 grid gap-2 sm:grid-cols-2">
                <input type="hidden" name="id" value={f.id} /><input type="hidden" name="sort" value={f.sort} />
                <input name="questionBn" defaultValue={f.questionBn} className="field h-9 text-sm" required />
                <input name="question" defaultValue={f.question} className="field h-9 text-sm" required />
                <textarea name="answerBn" defaultValue={f.answerBn} className="field min-h-16 text-sm" required />
                <textarea name="answer" defaultValue={f.answer} className="field min-h-16 text-sm" required />
                <SubmitButton className="btn-soft h-9 px-3 text-xs sm:col-span-2">{pick(locale, "সেভ", "Save")}</SubmitButton>
              </ActionForm>
              <form action={deleteFaqAction} className="mt-2 text-right"><input type="hidden" name="id" value={f.id} /><button className="btn-danger h-9 px-3 text-xs"><Trash2 className="size-4" /> {pick(locale, "মুছুন", "Delete")}</button></form>
            </details>
          ))}
        </div>
        <ActionForm action={saveFaqAction} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="sort" value={faqs.length} />
          <input name="questionBn" className="field h-10" placeholder={pick(locale, "প্রশ্ন (বাংলা)", "Question (Bangla)")} required />
          <input name="question" className="field h-10" placeholder="Question (English)" required />
          <textarea name="answerBn" className="field min-h-16" placeholder={pick(locale, "উত্তর (বাংলা)", "Answer (Bangla)")} required />
          <textarea name="answer" className="field min-h-16" placeholder="Answer (English)" required />
          <SubmitButton className="btn-primary h-10 w-full sm:col-span-2">{pick(locale, "FAQ যোগ করুন", "Add FAQ")}</SubmitButton>
        </ActionForm>
      </Section>
    </div>
  )
}

function Field({ k, label, type = "text", value }: { k: string; label: string; type?: string; value: string }) {
  return (
    <div><label className="label" htmlFor={k}>{label}</label><input id={k} name={k} type={type} defaultValue={value} className="field h-10" /></div>
  )
}
