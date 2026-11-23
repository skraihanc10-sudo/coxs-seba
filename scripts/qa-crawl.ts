/**
 * Walks every route as every role and reports anything that is not a clean
 * page: HTTP 5xx, Next.js error overlays, "Application error", unhandled
 * console errors, or a redirect to /login where one should not happen.
 *
 *   RATE_LIMIT=off npm run dev           (terminal 1)
 *   npx tsx scripts/qa-crawl.ts          (terminal 2)  → exits 1 when anything is wrong
 */
import { chromium, type Browser, type Page } from "@playwright/test"

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:47291"
const CHROME = process.env.CHROME_PATH

type Who = { label: string; email?: string; password?: string }
const ROLES: Who[] = [
  { label: "anon" },
  { label: "customer", email: "customer@needcoxs.test", password: "customer123" },
  { label: "owner", email: "owner@needcoxs.test", password: "owner123" },
  { label: "admin-coxs", email: "admin@needcoxs.test", password: "admin123" },
  { label: "admin-dhaka", email: "dhaka.admin@needcoxs.test", password: "admin123" },
  { label: "support", email: "support@needcoxs.test", password: "support123" },
  { label: "worker", email: "jamal.electric@needcoxs.test", password: "rider123" },
  { label: "partner", email: "partner.rony@needcoxs.test", password: "rider123" },
]

/** [path, roles that should see a 200 page here (others may redirect or 404)] */
const ROUTES: Array<[string, string[]]> = [
  ["/", ["*"]],
  ["/services", ["*"]],
  ["/services/laundry", ["*"]],
  ["/services/rent-a-car", ["*"]],
  ["/services/does-not-exist", []],
  ["/book/laundry/wash-iron", ["anon", "customer"]],
  ["/book/rent-a-car/chander-gari", ["anon", "customer"]],
  ["/vehicles/does-not-exist", []],
  ["/services/resort-booking", ["*"]],
  ["/services/cox-shutki", ["*"]],
  ["/shop/checkout", ["*"]],
  ["/shop/does-not-exist", []],
  ["/admin/products", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/products/new", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/stays/does-not-exist", []],
  ["/partner/resort", ["*"]],
  ["/admin/stays", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/stays/new", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/worker/stays", ["worker", "partner"]],
  ["/worker/stays/new", ["worker", "partner"]],
  ["/how-it-works", ["*"]],
  ["/help", ["*"]],
  ["/branches", ["*"]],
  ["/branches/coxs-bazar", ["*"]],
  ["/branches/dhaka", ["*"]],
  ["/partner", ["*"]],
  ["/login", ["anon"]],
  ["/bookings", ["customer"]],
  ["/bookings/LN-10001", ["customer"]],
  ["/care", ["customer"]],
  ["/notifications", ["customer"]],
  ["/profile", ["customer"]],
  ["/help/tickets/new", ["customer"]],
  ["/help/tickets/TK-10001", ["customer"]],
  ["/admin", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/bookings", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/bookings?status=COMPLETED", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/bookings/LN-10001", ["owner", "admin-coxs"]],
  ["/admin/workers", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/workers/new", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/customers", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/services", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/areas", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/reports", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/reports?p=year&g=service", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/staff", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/settings", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/vehicles", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/coupons", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/vehicles/new", ["owner", "admin-coxs", "admin-dhaka"]],
  ["/admin/shops", ["owner"]],
  ["/admin/shops/new", ["owner"]],
  ["/admin/shops/shop_coxs_sadar", ["owner"]],
  ["/support", ["owner", "admin-coxs", "admin-dhaka", "support"]],
  ["/support?f=unread", ["owner", "admin-coxs", "admin-dhaka", "support"]],
  ["/support/bookings", ["owner", "admin-coxs", "admin-dhaka", "support"]],
  ["/support/bookings/EL-10002", ["owner", "admin-coxs", "support"]],
  ["/support/tickets", ["owner", "admin-coxs", "admin-dhaka", "support"]],
  ["/support/tickets/TK-10001", ["owner", "admin-coxs", "support"]],
  ["/support/templates", ["owner", "admin-coxs", "admin-dhaka", "support"]],
  ["/worker", ["worker", "partner"]],
  ["/worker/jobs/EL-10002", ["worker"]],
  ["/worker/earnings", ["worker", "partner"]],
  ["/worker/notifications", ["worker", "partner"]],
  ["/worker/account", ["worker", "partner"]],
  ["/worker/vehicles", ["worker", "partner"]],
  ["/worker/vehicles/new", ["worker", "partner"]],
  ["/sitemap.xml", ["*"]],
  ["/robots.txt", ["*"]],
  ["/manifest.webmanifest", ["*"]],
  ["/opengraph-image", ["*"]],
  ["/api/health", ["*"]],
]

const problems: string[] = []

async function login(page: Page, who: Who) {
  if (!who.email) return
  await page.goto(`${BASE}/login?tab=staff`)
  await page.locator('form[data-ready="true"]').first().waitFor({ state: "attached" })
  await page.fill("#identifier", who.email)
  await page.fill("#password", who.password!)
  await page.getByRole("button", { name: "লগইন" }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"))
}

async function crawl(browser: Browser, who: Who) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text())
  })
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`))
  let navigations = 0
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations += 1
  })
  await login(page, who)
  for (const [path, allowed] of ROUTES) {
    consoleErrors.length = 0
    navigations = 0
    const expectPage = allowed.includes("*") || allowed.includes(who.label)
    let status = 0
    try {
      // "load" + a short settle instead of "networkidle": a dev-server reload
      // loop would otherwise hang the crawl forever; we count reloads instead.
      const res = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 60_000 })
      status = res?.status() ?? 0
      await page.waitForTimeout(1_500)
    } catch (error) {
      problems.push(`[${who.label}] ${path}: navigation failed: ${(error as Error).message.split("\n")[0]}`)
      continue
    }
    if (navigations > 3) problems.push(`[${who.label}] ${path}: page reloaded ${navigations} times (reload loop)`)
    const finalPath = new URL(page.url()).pathname
    const html = await page.content()
    if (status >= 500 || /Application error|Internal Server Error|Unhandled Runtime Error|__next_error__/.test(html)) {
      problems.push(`[${who.label}] ${path}: HTTP ${status} / error page`)
    }
    if (expectPage && (status !== 200 || (finalPath.startsWith("/login") && !path.startsWith("/login")))) {
      problems.push(`[${who.label}] ${path}: expected a page, got HTTP ${status} at ${finalPath}`)
    }
    if (!expectPage && status === 200 && finalPath === path.split("?")[0] && !path.startsWith("/book/") && path !== "/login") {
      problems.push(`[${who.label}] ${path}: should NOT be visible to this role (HTTP 200 at ${finalPath})`)
    }
    const real = consoleErrors.filter((e) => !/favicon|hydrat.*nc_|Download the React DevTools|net::ERR_ABORTED|status of 404/.test(e))
    if (real.length) problems.push(`[${who.label}] ${path}: console: ${real[0].slice(0, 160)}`)
    process.stdout.write(`${status === 200 ? "." : status >= 500 ? "X" : "-"}`)
  }
  await context.close()
  process.stdout.write(`  ${who.label}\n`)
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME || undefined })
  for (const who of ROLES) await crawl(browser, who)
  await browser.close()
  if (problems.length) {
    console.log(`
${problems.length} problem(s):`)
    for (const p of problems) console.log(` - ${p}`)
    process.exit(1)
  }
  console.log("All routes clean for every role.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
