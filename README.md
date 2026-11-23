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
| **PARTNER** (a WORKER whose profile is `kind: PARTNER`) | `/partner` to apply, then `/worker` | an outside car/bike owner: applies with their first vehicle, waits for admin approval, then gets rental orders, chats with the customer and sees their share of each rental under *My vehicles / Earnings* |
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
| Vehicle partner (Cox's Bazar) | partner.rony@needcoxs.test / rider123 |

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

## Rent-a-car and vehicle partners
The rental category (`flow: RENTAL`) is a marketplace, not just a price list. `/services/rent-a-car` shows every live vehicle of **every branch** in one grid (type chips: scooter/bike, car, jeep…), each card with photo, type badge, day/hour/half-day rate, seats, spec tags and a Book button. Booking follows the vehicle: a vehicle from another branch books through that branch's areas and payments. The order gets a `CR-` number and the exact vehicle is kept on it. Rates: hourly (with a minimum), half-day (6 hours, flat), daily, and **route packages** (fixed-price trips such as "Cox's Bazar to Patuartek · 6–7 h · 7–13 people · ৳4,000", typed one per line as `name | attractions | duration | capacity | price` on the vehicle form). Each vehicle has a page at `/vehicles/<id>` with its photos, specs and route table; booking a route fixes the price. The four vehicle types are bike, car, chander gari (open-roof jeep) and bus; the seed moves vehicles of the older price-based types over and hides those. Vehicles come from two places:

- **Shop fleet** — admin → **Vehicles → New vehicle** (owner left blank = HANDYO's own).
- **Partners** — a vehicle owner fills `/partner` (name, mobile, password, first vehicle, photos). That creates an inactive WORKER with `kind: PARTNER` and a PENDING vehicle. Admin → **Vehicles** shows it first; **Approve** switches the login on and puts the vehicle on the site, **Reject** needs a reason. Partners can add more vehicles (each needs approval), pause one, and edit rates.

When a rental order arrives, the admin opens it and clicks **Send to the vehicle owner** (one click; the owner is preselected in the worker dropdown too). From there it is a normal job in the owner's `/worker` panel: accept, on the way, done, booking chat with the customer. Partners earn `partnerShare` % of the rental (Settings, default 85); staff workers keep `workerShare` %.

## Resort & hotel booking
The stay category (`flow: STAY`, slug `resort-booking`) is a second marketplace: `/services/resort-booking` lists every live property of every branch (resort / hotel / cottage / guest house chips, area filter), `/stays/<id>` shows photos, amenities, policy and the room types with nightly prices, and `/book-stay/<id>?room=<roomTypeId>` is a three-step wizard (dates + rooms + guests with live availability → contact / OTP → coupon, payment, confirm). Availability counts overlapping non-cancelled bookings per room type against `totalRooms`. A booking stores `propertyId`, `roomTypeId`, check-in (`visitDate`), `checkOut`, `nights`, `rooms`, `guests`, pricing `PER_NIGHT` with `unitPrice = nightly × rooms` and `quantity = nights`; codes start with `RS-`.

Properties come from **Admin → Resorts** (HANDYO-managed, live at once) or from owners who apply at `/partner/resort` (inactive WORKER + PARTNER profile + PENDING property; approve switches the login on). Partners manage theirs under `/worker/stays`; room types are typed one per line as `name | sleeps | price per night | rooms | amenities`. The stay flow is REQUESTED → CONFIRMED → ASSIGNED (sent to the resort owner, one click on the order) → ACCEPTED (resort confirmed) → IN_PROGRESS (checked in) → COMPLETED (checked out); owners earn `partnerShare` %.

## Product shops (শুঁটকি and আচার, partner stores)
Two SHOP-flow categories, `shutki` (codes `SH-`) and `achar` (codes `AC-`), share one storefront engine. Products belong to a **shelf** (`ProductGroup`, listed under one category) and a **store** (`Store`: a partner's shop such as "বিসমিল্লাহ শুঁটকি শপ", or HANDYO's own when no owner). `/services/shutki` and `/services/achar` show every store's items together with a row of store chips on top; picking a store shows only its items. Store owners apply at `/partner/store` (PARTNER profile + PENDING store, approved under **Admin → Stores**) and manage their products under `/worker/store`. Admin → Products edits everything and can attach a product to any store. Variants are typed one per line as `label | price | old price | stock`.

The cart lives in the browser; `/shop/checkout` re-prices it on the server, groups it **per store into parcels** (one parcel if everything is from one store), charges delivery per parcel, and creates one ServiceBooking per store with `OrderItem` lines, `storeId`, `unitPrice` = subtotal, `visitCharge` = delivery; stock is decremented. Each store owner is notified of their parcel; the office transfers it with "Send to the store owner" (or it goes straight to them when the partner has the direct switch). Settings: `shopDelivery`, `shopFreeAbove`, `shopMinOrder`. Flow: REQUESTED → CONFIRMED → IN_PROGRESS (packing) → OUT_FOR_DELIVERY → COMPLETED. The seed loads the owner's existing catalogue (prisma/shop-demo.ts, photos in public/demo/shop) across three demo stores.

## Partners and the direct switch
Every partner business (vehicle owners, resort owners, store owners) is a WORKER with `kind: PARTNER`. New bookings go to the office first; the office sends them to the owner with one click. Admin → Workers → the partner → **"Send bookings straight to this partner"** (`autoAssign`) skips that step: the booking is created already ASSIGNED to them (the office still sees it). HANDYO keeps 10 % of every partner bill (`partnerShare` = 90, Settings).

## Coupons
Admin → **Coupons**: a code per shop, percent or fixed taka, optional cap, minimum job amount, one category only, start/end dates, total and per-customer limits. The customer types it on the last step of the booking wizard; the discount comes off the work price only (never the area/visit charge), is stored on the booking (`couponCode`, `discount`) and shows on every booking view. Demo codes: `HANDYO10` (10 %, max ৳300, once per customer) and `MARINE500` (৳500 off rentals over ৳3,000).

## Adding a shop
Sign in as the owner → **Admin → Shops → New shop**. Give it a slug, names, city, contact, paste its areas (one per line: `slug | English | বাংলা | charge`), choose which shop to copy services & prices from, and create its first admin. That admin then signs in and only ever sees their own shop.

## Still to do before real customers
- Real SMS provider for OTPs (`SMS_PROVIDER` + keys) — until then the code is 123456.
- Real bKash / Nagad checkout (interfaces are in `src/lib/payments.ts`).
- Replace the demo passwords (`npm run db:setup` seeds them; `/admin/staff` and `/admin/workers` can reset them) and set `SHOW_DEMO_LOGINS=0`.
- Email notifications (in-app notices exist; email/push can hang off `src/lib/notify.ts`).
