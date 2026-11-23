import { test, expect, type Page, type Browser } from "@playwright/test"

/**
 * End-to-end flows for HANDYO. Run against `npm run dev` with RATE_LIMIT=off
 * and a seeded database (`npm run db:setup`). Demo logins come from the seed.
 */

const ADMIN = { email: "admin@needcoxs.test", password: "admin123" }
const SUPPORT = { email: "support@needcoxs.test", password: "support123" }
const CUSTOMER = { email: "customer@needcoxs.test", password: "customer123" }
const TANIA = { email: "tania@needcoxs.test", password: "demo-01911000001" }
const RIDER = { email: "rider@needcoxs.test", password: "rider123" }
const JAMAL = { email: "jamal.electric@needcoxs.test", password: "rider123" }
const RINA = { email: "rina.clean@needcoxs.test", password: "rider123" }
const OWNER = { email: "owner@needcoxs.test", password: "owner123" }
const DHAKA_ADMIN = { email: "dhaka.admin@needcoxs.test", password: "admin123" }

/** Wait until React has hydrated the first form on the page, so clicks and fills stick. */
async function ready(page: Page) {
  await page.locator('form[data-ready="true"]').first().waitFor({ state: "attached" })
}

async function loginWithPassword(page: Page, who: { email: string; password: string }) {
  await page.goto("/login?tab=staff")
  await ready(page)
  await page.fill("#identifier", who.email)
  await page.fill("#password", who.password)
  await page.getByRole("button", { name: "লগইন" }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"))
}

async function loginWithOtp(page: Page, phone: string, name: string) {
  await page.goto("/login")
  await ready(page)
  await page.fill("#phone", phone)
  await page.getByRole("button", { name: "কোড পাঠান" }).click()
  await expect(page.getByText("ডেমো কোড: 123456")).toBeVisible()
  await page.fill("#code", "123456")
  await page.fill("#name", name)
  await page.getByRole("button", { name: "ঢুকুন" }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"))
}

async function freshPage(browser: Browser) {
  const context = await browser.newContext()
  return context.newPage()
}

/** Walk the 3-step wizard. Returns the booking code from the success URL. */
async function book(page: Page, path: string, opts: { quantity?: number; team?: number; days?: number; notes?: string } = {}) {
  await page.goto(path)
  await expect(page.getByRole("heading", { name: "বুকিং" })).toBeVisible()
  await ready(page)
  if (opts.quantity) await page.locator('input[type="number"]').first().fill(String(opts.quantity))
  if (opts.team) await page.locator('input[type="number"]').nth(1).fill(String(opts.team))
  if (opts.days) await page.locator('input[type="number"]').nth(2).fill(String(opts.days))
  if (opts.notes) await page.fill("#notes", opts.notes)
  await page.getByRole("button", { name: "পরের ধাপ" }).click()
  await page.selectOption("#area", { index: 1 })
  await page.fill("#addressLine", "বাড়ি ১২, রোড ৩")
  await page.fill("#landmark", "মসজিদের পাশে")
  if (!(await page.inputValue("#phone"))) await page.fill("#phone", "01711000001")
  await page.getByRole("button", { name: "08:00–11:00" }).click()
  await page.getByRole("button", { name: "পরের ধাপ" }).click()
  await page.getByRole("button", { name: "বুকিং নিশ্চিত করুন" }).click()
  await page.waitForURL(/\/bookings\/[A-Z]{2,3}-\d{5}/)
  const code = page.url().match(/[A-Z]{2,3}-\d{5}/)![0]
  await expect(page.getByText("বুকিং হয়ে গেছে!")).toBeVisible()
  return code
}

async function assign(page: Page, code: string, workerName: string) {
  await page.goto(`/admin/bookings/${code}`)
  await ready(page)
  const option = page.locator("select[name=workerId] option", { hasText: workerName }).first()
  await page.selectOption("select[name=workerId]", (await option.getAttribute("value"))!)
  await page.getByRole("button", { name: "ঠিক করুন" }).click()
  await expect(page.getByText(workerName).first()).toBeVisible()
  await expect(page.locator(".pill", { hasText: "কর্মী ঠিক হয়েছে" }).first()).toBeVisible()
}

async function press(page: Page, label: string, nextLabel?: string) {
  await ready(page)
  await page.getByRole("button", { name: label, exact: true }).click()
  if (nextLabel) await expect(page.getByRole("button", { name: nextLabel, exact: true })).toBeVisible()
}

test("1. laundry: customer books, admin assigns, rider completes every step, customer reviews", async ({ browser }) => {
  const customer = await freshPage(browser)
  await loginWithOtp(customer, "01799990001", "টেস্ট কাস্টমার")
  const code = await book(customer, "/book/laundry/wash-iron", { quantity: 5 })

  const admin = await freshPage(browser)
  await loginWithPassword(admin, ADMIN)
  await assign(admin, code, "সাইফুল")

  const rider = await freshPage(browser)
  await loginWithPassword(rider, RIDER)
  await rider.goto("/worker")
  await expect(rider.getByText(code)).toBeVisible()
  await rider.goto(`/worker/jobs/${code}`)
  await press(rider, "জব গ্রহণ করুন", "কাপড় নিয়েছি")
  await press(rider, "কাপড় নিয়েছি", "লন্ড্রিতে জমা দিয়েছি")
  await press(rider, "লন্ড্রিতে জমা দিয়েছি", "কাপড় রেডি")
  await press(rider, "কাপড় রেডি", "ডেলিভারিতে যাচ্ছি")
  await press(rider, "ডেলিভারিতে যাচ্ছি", "কাজ শেষ")
  await press(rider, "কাজ শেষ")
  await expect(rider.getByRole("button", { name: "টাকা নেওয়া হয়েছে" })).toBeVisible()
  await rider.getByRole("button", { name: "টাকা নেওয়া হয়েছে" }).click()
  await expect(rider.getByText("পরিশোধিত")).toBeVisible()

  await customer.goto(`/bookings/${code}`)
  await expect(customer.locator(".pill", { hasText: "সম্পন্ন" }).first()).toBeVisible()
  await ready(customer)
  await customer.locator('input[name="rating"][value="5"]').check({ force: true })
  await customer.fill('textarea[name="comment"]', "কাপড় একদম ঝকঝকে, সময়মতো দিয়েছে।")
  await customer.getByRole("button", { name: "রিভিউ দিন" }).click()
  await expect(customer.getByText("আপনার রিভিউ")).toBeVisible()
})

test("2. electrician inspection: quote → customer accepts → work completed", async ({ browser }) => {
  const customer = await freshPage(browser)
  await loginWithPassword(customer, CUSTOMER)
  const code = await book(customer, "/book/electrician/wiring", { notes: "পুরো বাসার ওয়্যারিং পুরনো" })

  const admin = await freshPage(browser)
  await loginWithPassword(admin, ADMIN)
  await assign(admin, code, "জামাল")

  const worker = await freshPage(browser)
  await loginWithPassword(worker, JAMAL)
  await worker.goto(`/worker/jobs/${code}`)
  await press(worker, "জব গ্রহণ করুন", "রওনা দিয়েছি")
  await press(worker, "রওনা দিয়েছি", "পৌঁছেছি")
  await press(worker, "পৌঁছেছি")
  await expect(worker.getByText("আগে দাম পাঠান")).toBeVisible()
  await worker.fill('input[name="amount"]', "1500")
  await worker.fill('input[name="note"]', "২ রুমের তার বদল")
  await worker.getByRole("button", { name: "পাঠান" }).click()
  await expect(worker.getByText("পাঠানো হয়েছে").first()).toBeVisible()

  await customer.goto(`/bookings/${code}`)
  await expect(customer.getByText("দাম এসেছে")).toBeVisible()
  await ready(customer)
  await customer.getByRole("button", { name: "মেনে নিলাম" }).click()
  await expect(customer.getByText("দাম এসেছে")).toHaveCount(0)

  await worker.goto(`/worker/jobs/${code}`)
  await press(worker, "কাজ শুরু", "কাজ শেষ")
  await press(worker, "কাজ শেষ")
  await expect(worker.locator(".pill", { hasText: "সম্পন্ন" }).first()).toBeVisible()
  await expect(worker.getByText(/৳(1,500|১,৫০০)/).first()).toBeVisible()
})

test("3. resort cleaning team booking with rooms, team size and days", async ({ browser }) => {
  const customer = await freshPage(browser)
  await loginWithPassword(customer, CUSTOMER)
  const code = await book(customer, "/book/resort-cleaning/room-turnover", { quantity: 10, team: 4, days: 2 })
  await expect(customer.getByText("10 রুম × 2 দিন · 4 জন")).toBeVisible()

  const admin = await freshPage(browser)
  await loginWithPassword(admin, ADMIN)
  await assign(admin, code, "রিনা")
  const worker = await freshPage(browser)
  await loginWithPassword(worker, RINA)
  await worker.goto("/worker")
  await expect(worker.getByText(code)).toBeVisible()
})

test("4. a booking outside the shop's areas is rejected by the server", async ({ browser }) => {
  const customer = await freshPage(browser)
  await loginWithPassword(customer, CUSTOMER)
  await customer.goto("/book/plumber/tap-basin")
  await ready(customer)
  await customer.getByRole("button", { name: "পরের ধাপ" }).click()
  // Nothing chosen: the wizard explains the Sadar rule before even submitting.
  await customer.getByRole("button", { name: "পরের ধাপ" }).click()
  await expect(customer.getByText(/শুধু কক্সবাজার সদর/).first()).toBeVisible()
  // Now force an area that is not ours and let the server decide.
  await customer.selectOption("#area", { index: 1 })
  await customer.fill("#addressLine", "চকরিয়া বাজার")
  await customer.getByRole("button", { name: "08:00–11:00" }).click()
  await customer.getByRole("button", { name: "পরের ধাপ" }).click()
  await customer.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('input[name="areaId"]')
    if (input) input.value = "teknaf-not-sadar"
  })
  await customer.getByRole("button", { name: "বুকিং নিশ্চিত করুন" }).click()
  await expect(customer.getByText("এই মুহূর্তে আমরা শুধু কক্সবাজার সদর এলাকায় সেবা দিচ্ছি").first()).toBeVisible()
  expect(customer.url()).toContain("/book/")
})

test("5. customer care chat and a support ticket, both answered by support", async ({ browser }) => {
  const customer = await freshPage(browser)
  await loginWithPassword(customer, CUSTOMER)
  await customer.goto("/care")
  await ready(customer)
  const question = `খুরুশকুলে কি আজ প্লাম্বার পাওয়া যাবে? ${Date.now()}`
  await customer.fill('textarea[name="body"]', question)
  await customer.getByRole("button", { name: "Send" }).click()
  await expect(customer.getByText(question)).toBeVisible()

  const support = await freshPage(browser)
  await loginWithPassword(support, SUPPORT)
  await support.goto("/support")
  await support.getByRole("link", { name: /^রাশেদ আহমেদ/ }).first().click()
  await expect(support.getByText(question)).toBeVisible()
  await ready(support)
  await support.getByRole("button", { name: "স্বাগতম" }).click()
  await support.getByRole("button", { name: "Send" }).click()
  await expect(support.getByText("যোগাযোগের জন্য ধন্যবাদ").first()).toBeVisible()
  await customer.goto("/care")
  await expect(customer.getByText("যোগাযোগের জন্য ধন্যবাদ").first()).toBeVisible()

  await customer.goto("/help/tickets/new")
  await ready(customer)
  await customer.selectOption("#category", "REFUND")
  await customer.fill("#subject", "ভুল চার্জ কাটা হয়েছে")
  await customer.fill("#body", "গত সপ্তাহের লন্ড্রিতে ভিজিট চার্জ দুবার ধরা হয়েছে।")
  await customer.getByRole("button", { name: "টিকেট পাঠান" }).click()
  await customer.waitForURL(/\/help\/tickets\/TK-\d{5}/)
  const ticket = customer.url().match(/TK-\d{5}/)![0]

  await support.goto(`/support/tickets/${ticket}`)
  await expect(support.getByText("ভিজিট চার্জ দুবার")).toBeVisible()
  await ready(support)
  await support.fill('textarea[name="body"]', "দুঃখিত! বাড়তি টাকা বিকাশে ফেরত দিচ্ছি।")
  await support.getByRole("button", { name: "Send" }).click()
  await support.selectOption('select[name="status"]', "RESOLVED")
  await support.getByRole("button", { name: "সেভ" }).click()
  await customer.goto(`/help/tickets/${ticket}`)
  await expect(customer.getByText("বাড়তি টাকা বিকাশে ফেরত").first()).toBeVisible()
  await expect(customer.getByText("সমাধান হয়েছে", { exact: true })).toBeVisible()
})

test("6. a customer cannot open someone else's booking, and panels need the right role", async ({ browser }) => {
  const tania = await freshPage(browser)
  await loginWithPassword(tania, TANIA)
  const res = await tania.goto("/bookings/LN-10001")
  expect(res?.status()).toBe(404)
  await expect(tania.getByText("পেজটা পাওয়া যায়নি")).toBeVisible()
  await tania.goto("/admin")
  await expect(tania).toHaveURL(/\/$|\/login/)
  await tania.goto("/worker")
  await expect(tania).not.toHaveURL(/\/worker/)

  const anon = await freshPage(browser)
  await anon.goto("/support")
  await expect(anon).toHaveURL(/\/login\?next=%2Fsupport/)
})

test("7. shops keep separate books: Dhaka admin cannot see Cox's Bazar data, owner sees every shop", async ({ browser }) => {
  const dhaka = await freshPage(browser)
  await loginWithPassword(dhaka, DHAKA_ADMIN)
  await dhaka.goto("/admin/bookings")
  // Orders are grouped by category first; open the electrician tile to see its list.
  await dhaka.getByRole("link", { name: /EL-xxxxx/ }).click()
  await expect(dhaka.getByText("EL-30001").first()).toBeVisible()
  await expect(dhaka.getByText("LN-10001")).toHaveCount(0)
  await dhaka.goto("/admin/bookings?q=LN-10001")
  await expect(dhaka.getByText("LN-10001")).toHaveCount(0)
  const res = await dhaka.goto("/admin/bookings/LN-10001")
  expect(res?.status()).toBe(404)
  await dhaka.goto("/admin/shops")
  await expect(dhaka).not.toHaveURL(/\/admin\/shops/)

  const owner = await freshPage(browser)
  await loginWithPassword(owner, OWNER)
  await owner.goto("/admin/shops")
  await expect(owner.getByRole("link", { name: "HANDYO ঢাকা" })).toBeVisible()
  await expect(owner.getByRole("link", { name: "HANDYO কক্সবাজার" })).toBeVisible()
  await owner.goto("/admin/bookings/LN-10001")
  await expect(owner.getByText("LN-10001").first()).toBeVisible()
})

test("8. customer can switch branch and sees that branch's areas; rent-a-car is bookable", async ({ browser }) => {
  const customer = await freshPage(browser)
  await loginWithPassword(customer, CUSTOMER)
  await customer.goto("/branches")
  await expect(customer.getByRole("heading", { name: "HANDYO ঢাকা" })).toBeVisible()
  await customer.goto("/book/rent-a-car/chander-gari")
  await ready(customer)
  await customer.getByRole("button", { name: "পরের ধাপ" }).click()
  const options = await customer.locator("#area option").allTextContents()
  expect(options.join(" ")).toContain("কলাতলী")
  expect(options.join(" ")).not.toContain("ধানমন্ডি")
})

test("9. rent-a-car: a partner applies, the admin approves, a customer books that vehicle and the order reaches the partner", async ({ browser }) => {
  const phone = `0181${String(Date.now()).slice(-7)}`
  const carBn = `টেস্ট করোলা ${phone.slice(-4)}`
  // 1. Vehicle owner applies from the public page.
  const owner = await freshPage(browser)
  await owner.goto("/partner")
  await ready(owner)
  await owner.fill('input[name="name"]', "টেস্ট পার্টনার")
  await owner.fill('input[name="phone"]', phone)
  await owner.fill('input[name="password"]', "partner123")
  await owner.selectOption('select[name="offeringId"]', { index: 1 })
  await owner.fill('input[name="title"]', "Test Corolla 2015")
  await owner.fill('input[name="titleBn"]', carBn)
  await owner.fill('input[name="pricePerHour"]', "400")
  await owner.fill('input[name="pricePerDay"]', "3000")
  await owner.check('input[name="agree"]')
  await owner.getByRole("button", { name: "আবেদন জমা দিন" }).click()
  await expect(owner.getByText("আবেদন জমা হয়েছে")).toBeVisible()

  // Not approved yet: login is refused.
  await owner.goto("/login?tab=staff")
  await ready(owner)
  await owner.fill("#identifier", phone)
  await owner.fill("#password", "partner123")
  await owner.getByRole("button", { name: "লগইন" }).click()
  await expect(owner).toHaveURL(/\/login/)

  // 2. Admin sees it pending and approves.
  const admin = await freshPage(browser)
  await loginWithPassword(admin, ADMIN)
  await admin.goto("/admin/vehicles")
  await ready(admin)
  const card = admin.locator(".card", { hasText: carBn }).first()
  await expect(card).toBeVisible()
  await card.getByRole("button", { name: "অনুমোদন দিন" }).click()
  await expect(admin.locator(".card", { hasText: carBn }).first().getByRole("button", { name: "অনুমোদন দিন" })).toHaveCount(0)
  await expect(admin.locator(".card", { hasText: carBn }).first().getByText("চালু").first()).toBeVisible()

  // 3. A customer picks exactly that vehicle and books it by the hour.
  const customer = await freshPage(browser)
  await loginWithPassword(customer, CUSTOMER)
  await customer.goto("/services/rent-a-car")
  const vehicleCard = customer.locator(".card", { hasText: carBn }).first()
  await expect(vehicleCard).toBeVisible()
  await vehicleCard.getByRole("link", { name: /বুক করুন/ }).click()
  await expect(customer).toHaveURL(/vehicle=/)
  await expect(customer.getByText(carBn).first()).toBeVisible()
  const code = await book(customer, customer.url(), { quantity: 3 })
  expect(code.startsWith("CR-")).toBeTruthy()
  await expect(customer.getByText(carBn).first()).toBeVisible()
  await expect(customer.getByText(/৳১,২০০|৳1,200/).first()).toBeVisible()

  // 4. Admin sends the order to the vehicle owner with one click.
  await admin.goto(`/admin/bookings/${code}`)
  await ready(admin)
  await admin.getByRole("button", { name: "গাড়ির মালিকের কাছে পাঠান" }).click()
  await expect(admin.getByText("টেস্ট পার্টনার").first()).toBeVisible()

  // 5. The partner logs in and sees it in the partner panel, with chat to the customer.
  await owner.goto("/login?tab=staff")
  await ready(owner)
  await owner.fill("#identifier", phone)
  await owner.fill("#password", "partner123")
  await owner.getByRole("button", { name: "লগইন" }).click()
  await owner.waitForURL(/\/worker/)
  await expect(owner.getByText("পার্টনার প্যানেল").first()).toBeVisible()
  await expect(owner.getByText(code).first()).toBeVisible()
  await owner.goto(`/worker/jobs/${code}`)
  await ready(owner)
  await owner.fill('textarea[name="body"]', "আমি ৯টায় হোটেলের গেটে থাকব।")
  await owner.getByRole("button", { name: "Send" }).click()
  await customer.goto(`/bookings/${code}`)
  await expect(customer.getByText("আমি ৯টায় হোটেলের গেটে থাকব।")).toBeVisible()
  await owner.goto("/worker/vehicles")
  await expect(owner.getByText(carBn).first()).toBeVisible()
})

test("10. a coupon code takes its discount off the work price and is kept on the booking", async ({ browser }) => {
  const customer = await freshPage(browser)
  await loginWithOtp(customer, `0171${String(Date.now()).slice(-7)}`, "কুপন কাস্টমার")
  await customer.goto("/book/home-cleaning/deep-clean")
  await expect(customer.getByRole("heading", { name: "বুকিং" })).toBeVisible()
  await ready(customer)
  await customer.locator('input[type="number"]').first().fill("4")
  await customer.getByRole("button", { name: "পরের ধাপ" }).click()
  await customer.selectOption("#area", { index: 1 })
  await customer.fill("#addressLine", "বাড়ি ১২, রোড ৩")
  await customer.getByRole("button", { name: "08:00–11:00" }).click()
  await customer.getByRole("button", { name: "পরের ধাপ" }).click()
  // Wrong code is refused, right code applies.
  await customer.fill("#coupon", "NOPE123")
  await customer.getByRole("button", { name: "প্রয়োগ" }).click()
  await expect(customer.getByText("এই কুপন কোডটা ঠিক নেই।")).toBeVisible()
  await customer.fill("#coupon", "handyo10")
  await customer.getByRole("button", { name: "প্রয়োগ" }).click()
  await expect(customer.getByText(/HANDYO10: 10% ছাড়/)).toBeVisible()
  await customer.getByRole("button", { name: "বুকিং নিশ্চিত করুন" }).click()
  await customer.waitForURL(/\/bookings\/CL-\d{5}/)
  await expect(customer.getByText("বুকিং হয়ে গেছে!")).toBeVisible()
  await expect(customer.getByText(/HANDYO10/).first()).toBeVisible()
})
