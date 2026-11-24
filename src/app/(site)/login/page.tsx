import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getLocale, getUser } from "@/lib/auth"
import { homeFor, safeNext } from "@/lib/roles"
import { pick, words } from "@/lib/i18n"
import { privateMeta } from "@/lib/seo"
import { loginAction } from "@/actions/auth"
import { ActionForm, SubmitButton } from "@/components/forms"
import { Mark } from "@/components/logo"
import { PageHeader } from "@/components/bits"
import { demoAccounts, demoShopStaff, demoWorkers, WORKER_PASSWORD } from "@/theme/demo-accounts"
import { OtpLogin } from "./otp-login"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return privateMeta(words(locale).login)
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; tab?: string }> }) {
  const [{ next = "", tab = "" }, locale, user] = await Promise.all([searchParams, getLocale(), getUser()])
  if (user) redirect(safeNext(user.role, next || homeFor(user.role)))
  const t = words(locale)
  const staff = tab === "staff"
  const showDemo = process.env.SHOW_DEMO_LOGINS !== "0"

  return (
    <div className="mx-auto max-w-md">
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0b1f3a,#0a3fb0_60%,#1259e8)] p-5 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden />
        <div className="relative flex items-center gap-3">
          <Mark size={44} />
          <div>
            <p className="display text-xl font-extrabold leading-tight">{pick(locale, "HANDYO-তে স্বাগতম", "Welcome to HANDYO")}</p>
            <p className="text-xs text-white/75">{pick(locale, "বুকিং, চ্যাট আর নোটিশ এক জায়গায়", "Bookings, chat and alerts in one place")}</p>
          </div>
        </div>
      </div>
      <PageHeader title={t.login} sub={pick(locale, "কাস্টমাররা মোবাইল নম্বর দিয়ে ঢুকুন। কর্মী আর অফিস ইমেইল-পাসওয়ার্ড দিয়ে।", "Customers sign in with a mobile number. Workers and office staff use email and password.")} />
      <nav aria-label={pick(locale, "লগইনের ধরন", "Sign-in type")} className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-paper p-1 ring-1 ring-line text-sm font-bold">
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} aria-current={!staff ? "page" : undefined} className={`rounded-full py-2 text-center ${!staff ? "bg-ink text-white" : "text-muted-foreground"}`}>{pick(locale, "মোবাইল নম্বর", "Mobile number")}</Link>
        <Link href={`/login?tab=staff${next ? `&next=${encodeURIComponent(next)}` : ""}`} aria-current={staff ? "page" : undefined} className={`rounded-full py-2 text-center ${staff ? "bg-ink text-white" : "text-muted-foreground"}`}>{pick(locale, "কর্মী / অফিস", "Worker / office")}</Link>
      </nav>

      {staff ? (
        <ActionForm action={loginAction} resetOnSuccess={false} className="card space-y-4 p-5">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="identifier">{pick(locale, "ইমেইল বা মোবাইল", "Email or mobile")}</label>
            <input id="identifier" name="identifier" className="field" autoComplete="username" required />
          </div>
          <div>
            <label className="label" htmlFor="password">{pick(locale, "পাসওয়ার্ড", "Password")}</label>
            <input id="password" name="password" type="password" className="field" autoComplete="current-password" required />
          </div>
          <SubmitButton pendingText={pick(locale, "ঢুকছি…", "Signing in…")}>{t.login}</SubmitButton>
        </ActionForm>
      ) : (
        <OtpLogin locale={locale} next={next} />
      )}

      {showDemo ? (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer font-bold text-muted-foreground">{pick(locale, "ডেমো লগইন", "Demo logins")}</summary>
          <div className="card mt-2 space-y-1 p-4 text-xs text-muted-foreground">
            {demoAccounts.map((a) => (
              <p key={a.email}><span className="font-bold text-ink">{a.label}:</span> {a.email} / {a.password}</p>
            ))}
            {demoShopStaff.map((a) => (
              <p key={a.email}><span className="font-bold text-ink">{a.name}:</span> {a.email} / {a.password}</p>
            ))}
            <p className="pt-1 font-bold text-ink">{pick(locale, "কর্মী", "Workers")}</p>
            {demoWorkers.map((w) => (
              <p key={w.email}><span className="font-bold text-ink">{w.name}:</span> {w.email} / {WORKER_PASSWORD}</p>
            ))}
            <p className="pt-1">{pick(locale, "কাস্টমার OTP (ডেমো): 123456", "Customer OTP (demo): 123456")}</p>
          </div>
        </details>
      ) : null}
    </div>
  )
}
