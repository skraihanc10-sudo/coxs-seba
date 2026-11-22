# HANDYO

Live: **https://handyo.bd**

One platform, many **shops**. A shop is a HANDYO branch (Cox's Bazar Sadar, Dhaka, …) or a partner business, and every shop keeps completely separate services & prices, areas & charges, workers, staff, bookings, chats, tickets, settings and books. Customers are shared: one mobile number works at every branch, and they pick the branch they are in from the header.

Services today: laundry pickup, WiFi, electricians, plumbers, cleaning crews, AC repair, moving, helpers, **car & bike rental** (bikes, cars with driver, open-roof jeeps for Marine Drive, microbus, airport pickup) and "describe your job". Customers book in Bangla (English toggle), pay cash / bKash / Nagad when the job is done.

Next.js 16 · Prisma 6 + SQLite · Tailwind 4 · Playwright. Runs as one Docker container (Coolify) with the database and photos on a `/data` volume.

## Roles
| Role | Where | Can |
|---|---|---|
| **CUSTOMER** | `/` `/bookings` `/care` `/help` | pick a branch, book with phone + OTP, track live status, chat, cancel/reschedule, review, open tickets |
| **WORKER** (one shop) | `/worker` | see today's jobs, Accept → On the way → Arrived → Start → Done (laundry: Pick up → At laundry → Ready → Delivering → Done), send quotes, before/after photos, chat, earnings |
| **SUPPORT** (one shop) | `/support` | that shop's inbox: care chats + tickets + booking chats, assign to self, reply templates, assign workers, move bookings |
| **ADMIN** (one shop) | `/admin` | that shop's dashboard, bookings, workers, customers, services & prices, areas & charges, reports + CSV, staff, settings |
| **OWNER** (all shops) | `/admin/shops` + `/admin` | create shops (copy services & prices from an existing one, paste areas, create the first admin), compare every shop's revenue / worker pay / margin side by side, switch into any shop's admin panel |

## Run locally
```bash
npm ci
npm run db:setup          # creates prisma/dev.db, applies migrations, seeds shops, areas, services, demo data
npm run dev               # http://localhost:47291
```
Demo logins are listed on `/login` (and below). OTP in demo mode is always **123456**.

| Who | Login |
|---|---|
| Customer | customer@needcoxs.test / customer123 (or any mobile + OTP 123456) |
| Owner (every shop) | owner@needcoxs.test / owner123 |
| Admin · Cox's Bazar | admin@needcoxs.test / admin123 |
| Admin · Dhaka | dhaka.admin@needcoxs.test / admin123 |
| Support · Cox's Bazar | support@needcoxs.test / support123 |
| Laundry rider | rider@needcoxs.test / rider123 |
| WiFi · Electrician · Cleaning · Plumber · AC · Driver | sumon.wifi@ · jamal.electric@ · rina.clean@ · karim.plumber@ · rafiq.ac@ · faruk.driver@needcoxs.test / rider123 |
| Electrician · Dhaka | dhaka.electric@needcoxs.test / rider123 |

## Checks
```bash
npm run lint && npm run typecheck && npm run build
RATE_LIMIT=off npm run dev           # in one terminal
CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npx playwright test   # in another
npx tsx scripts/screenshots.ts       # phone + desktop screenshots into ./screenshots
```

## How it is built
- `prisma/schema.prisma` — `Shop` at the top; `User` (5 roles, staff carry `shopId`), `WorkerProfile` + skills/areas, `ServiceCategory`/`ServiceOffering` (flows STANDARD / LAUNDRY / TEAM / CUSTOM / RENTAL; pricing FIXED / PER_KG / PER_ITEM / PER_HOUR / PER_DAY / PER_ROOM / QUOTE), `ServiceArea` (per shop, per-area charge), `ServiceBooking` + `BookingEvent` history, photos, reviews, payments, booking chat, care chat (per customer per shop), tickets, reply templates, notices, OTP codes, FAQs (global), settings (per shop).
- `src/lib/shops.ts` — `currentShop()` (what a visitor is browsing, cookie `nc_shop`) and `officeShop(user)` (what an office user works in; the owner switches with cookie `nc_office_shop`). Every page query is scoped with one of these.
- `src/lib/booking-flow.ts` — the state machine. Every status change goes through `moveBooking()` in `src/lib/bookings.ts`; wrong steps throw a Bangla error.
- `src/lib/validation.ts` — zod schemas for every form; `src/lib/auth.ts#actor()` checks the role in every server action; customers only ever load their own bookings, staff only their shop's (`bookingFor()` / `staffCanSee()`).
- `src/lib/sms.ts` / `src/lib/payments.ts` — provider interfaces. Demo SMS logs the code; payments are record-only until gateway keys exist.
- `src/lib/rate-limit.ts` — login, OTP, booking and message limits (set `RATE_LIMIT=off` for tests).
- `src/lib/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/opengraph-image.tsx`, `src/components/seo/json-ld.tsx` — metadata, canonical URLs, sitemap, Open Graph image and JSON-LD (LocalBusiness per branch, Service catalogs, FAQ, breadcrumbs).
- `src/app/api/uploads/[name]` — serves photos from `/data/uploads`.
- Fonts: **Nikosh** (Bangladesh Government standard) for Bangla headings, Noto Sans Bengali for body, Plus Jakarta Sans for English.

## Adding a shop
Sign in as the owner → **Admin → Shops → New shop**. Give it a slug, names, city, contact, paste its areas (one per line: `slug | English | বাংলা | charge`), choose which shop to copy services & prices from, and create its first admin. That admin then signs in and only ever sees their own shop.

## Still to do before real customers
- Real SMS provider for OTPs (`SMS_PROVIDER` + keys) — until then the code is 123456.
- Real bKash / Nagad checkout (interfaces are in `src/lib/payments.ts`).
- Replace the demo passwords (`npm run db:setup` seeds them; `/admin/staff` and `/admin/workers` can reset them) and set `SHOW_DEMO_LOGINS=0`.
- Email notifications (in-app notices exist; email/push can hang off `src/lib/notify.ts`).
