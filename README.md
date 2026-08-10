# luwjje

A production-ready e-commerce store — Scandinavian minimalism, sharp edges, Parchment and Navy.
Everything on the storefront is driven by the dashboard; nothing is hardcoded.

**Bilingual.** English and Arabic, RTL included, with an `*Ar` twin for every
customer-visible string. A blank Arabic field falls back to the English one.

**Egypt-first.** Prices in EGP, delivery priced per governorate across all 27.

**No customer accounts.** Shoppers check out as guests and track orders by email. The only
login in the whole app is a single password on `/dashboard`.

**Stack** — Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · Zustand ·
React Hook Form + Zod · Recharts

---

## Quick start

The database is **PostgreSQL** everywhere, local included — Vercel's filesystem is
ephemeral, so SQLite is not an option in production and keeping one engine avoids drift.

```bash
# 1. A database. Any Postgres works; this is the quickest local one:
docker run -d --name luwjje-pg \
  -e POSTGRES_USER=luwjje -e POSTGRES_PASSWORD=luwjje -e POSTGRES_DB=luwjje \
  -p 5434:5432 postgres:16-alpine

# 2. cp .env.example .env  and fill DATABASE_URL, AUTH_SECRET, DASHBOARD_PASSWORD
#    (the committed .env already points at the container above)

npm install          # also runs prisma generate
npm run db:migrate   # apply prisma/migrations
npm run db:seed      # governorates, pages, settings — catalogue left empty
npm run db:seed:demo # optional: a demo catalogue in EGP to look around
npm run dev          # http://localhost:3000
```

### Getting into the dashboard

Open **http://localhost:3000/dashboard** → a password screen appears.

Default password: **`luwjje-admin`** (set by `DASHBOARD_PASSWORD` in `.env`).

Change it from **Settings → Password**. Once changed it is stored bcrypt-hashed in the database
and the `.env` value stops mattering.

### Verify it works

```bash
npm run smoke        # 33 checks: pricing, promos, shipping, the order transaction, oversell
npm run gate         # 50 checks: password gate, session signing, order privacy, route access
npm run features     # 35 checks: Arabic/RTL, EGP, governorates, filter controls
npm run dash         # 34 checks: Arabic dashboard, grid tables, Excel export
```

`npm run features` needs a running server (`npm run build && npm start`), and briefly
mutates then restores a few rows — point it at a dev database, not production.

`npm run gate` also probes a running server if one is up (`GATE_BASE`, default
`http://localhost:3010`); without one it runs the non-HTTP checks and says so.

---

## How access works

| Who | Sees |
| --- | --- |
| Anyone | The whole storefront — browse, add to bag, check out. No sign-up, ever. |
| Whoever knows the password | `/dashboard` and everything under it. |

**The dashboard session.** Submitting the correct password sets an httpOnly cookie holding an
expiry signed with HMAC-SHA256 (`AUTH_SECRET`). Valid for 12 hours. Signature verification uses
Web Crypto, so Edge middleware checks it without loading Prisma or bcrypt — and the dashboard
layout repeats the check server-side, so protection never rests on middleware alone. Failed
attempts are throttled (8 per 15 minutes per IP).

**Reading an order without an account.** An order number alone is *not* enough — that would
expose a stranger's address to anyone guessing. A separate signed cookie records which orders
this browser has earned: you get it by placing the order, or by entering the order's email at
`/orders`, which unlocks exactly the orders placed with that address. A dashboard session can
read any order.

---

## Pages

### Storefront (public)

| Route | What it does |
| --- | --- |
| `/` | Hero, Best Sellers, offer block, colour palette — every section dashboard-editable |
| `/shop` | Grid with working `?color= ?category= ?price= ?sort= ?q= ?page=` filters |
| `/product/[slug]` | Gallery, colour + size selection, quantity, accordions, related products, JSON-LD |
| `/cart` | Line items, shipping form, sticky summary, promo code, free-shipping meter |
| `/checkout` | Review → Shipping → Payment, then the order is written |
| `/order/[number]` | Receipt — gated by the order-access cookie |
| `/orders` | Guest order lookup by email — lists every matching order to pick from |
| `/about`, `/journal`, `/pages/[slug]` | CMS pages edited in Settings → Content Pages |

### Dashboard (`/dashboard`, password only)

| Route | What it controls |
| --- | --- |
| `/dashboard/login` | The password screen |
| `/dashboard` | Redirects to Orders — there is no separate Overview page |
| `/dashboard/products` | Full CRUD, multi-image upload, colourways + per-SKU stock, draft/publish, Best Sellers curation and ordering. Every text field has an EN/ع toggle |
| `/dashboard/categories` | Rename, reorder, translate, and show or hide each category in the Shop filter |
| `/dashboard/stock` | Every SKU, inline quantity edit, per-SKU low-stock alert level |
| `/dashboard/orders` | All orders, detail view, status changes (cancelling returns stock) |
| `/dashboard/offers` | Hero banner, promo block, discount campaigns, home-page colour palette |
| `/dashboard/shipping` | A delivery price per governorate (all 27), editable as one grid, plus per-governorate free-shipping thresholds |
| `/dashboard/filters` | Which filter controls the customer sees at all, which colours are offered, and the price buckets |
| `/dashboard/promo-codes` | Codes, type, minimum spend, window, usage limits, enable/disable |
| `/dashboard/analytics` | Revenue over time, top products, top categories, status breakdown, and the Excel export |
| `/dashboard/settings` | Store identity, default language, currency, commerce defaults, socials, SEO, content pages, **password** |

---

## How the dashboard drives the site

There is no content in the codebase. Each storefront section reads a table:

| Storefront | Source of truth |
| --- | --- |
| Hero, offer block | `Banner` (with optional start/end dates) |
| Best Sellers row | `Product.isBestSeller` + `bestSellerOrder` |
| Shop grid, product pages | `Product` / `ProductVariant` / `ProductImage` |
| Prices shown | `Product.price`, adjusted by any live `Discount` |
| Colour palette strip | `PaletteSwatch` |
| Cart promo field | `PromoCode` |
| Delivery cost & free-over | `Governorate`, falling back to `SiteSettings` |
| Shop filter controls | `SiteSettings` toggles + `FilterColor` / `PriceRange` / `Category.visible` |
| Language shown | `SiteSettings.defaultLocale`, overridden by the visitor's cookie |
| Header/footer, SEO | `SiteSettings` |
| About / Journal / legal | `Page` |

Edit a price and the product page shows it on the next load. Unpublish a product and it leaves
the grid and its URL 404s. Disable a promo code and the cart stops accepting it.

### Trust boundary

The browser's cart is a **cache, not a source of truth**. `POST /api/cart/revalidate` re-prices
every line against the database on mount and on every change, and reconciles the local store
when a price, stock level or publication state has changed. `createOrder` then recomputes
subtotal, shipping and discount server-side, re-checks stock *inside* the transaction, and
decrements it there — so two shoppers cannot both take the last piece.

---

## Project layout

```
prisma/
  schema.prisma        11 models — PostgreSQL, no User table; guests only
  migrations/          0_init, applied automatically on every deploy
  governorates.ts      the 27 Egyptian governorates and their default rates
  seed.ts              governorates, pages, settings — no catalogue
  seed-demo.ts         optional demo catalogue, orders and traffic
  placeholders.ts      generates on-brand SVG product imagery (no network)
scripts/
  smoke-test.ts        commerce core against the real database
  gate-test.ts         password gate, session signing, order privacy
  feature-check.mjs    Arabic/RTL, EGP, governorates, filter controls
src/
  app/
    (storefront)/      public pages — full header/footer
    (minimal)/         cart, checkout, order — reduced chrome
    dashboard/
      login/           password screen (outside the shell)
      (shell)/         sidebar + every managed page
    actions/           server actions
    api/               cart revalidation, upload, CSV report, tracking
  components/{ui,storefront,dashboard}/
  lib/
    signing            HMAC helpers (Web Crypto, Edge-safe)
    session-token      dashboard cookie — no Node-only imports
    dashboard-auth     password check + throttle (Node)
    order-access       which orders this browser may read
    order-lookup       order number + email matching
    prisma · commerce · queries · analytics · orders · validations
```

### Design tokens

All in `tailwind.config.ts`. `borderRadius` and `boxShadow` are **overridden, not extended** —
`rounded-lg` and `shadow-md` do not exist, so the sharp-edged, shadowless language cannot be
broken by accident. Depth comes from 1px outlines and white-on-Parchment contrast.

Playfair Display for headlines, Inter for everything else. The only exceptions to radius 0 are
colour swatches (`rounded-full`) and checkboxes (`rounded-sm`), exactly as specified.

---

## Deploying to Vercel

The repo is ready to deploy — `npm run build` runs `prisma generate && prisma migrate deploy
&& next build`, so the database schema is applied on every deploy.

### 1. Create the database

In the Vercel dashboard: **Storage → Create Database → Postgres** (or use Neon/Supabase and
paste the URL yourself). Attaching a Vercel Postgres store sets `DATABASE_URL` automatically.

### 2. Create the Blob store (for product image uploads)

**Storage → Create Database → Blob.** This sets `BLOB_READ_WRITE_TOKEN`, and uploads from
Dashboard → Products go there instead of the local disk. Skip it and uploads will fail in
production — Vercel's filesystem is read-only.

### 3. Environment variables

**Settings → Environment Variables**, for Production *and* Preview:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | set for you by Vercel Postgres |
| `BLOB_READ_WRITE_TOKEN` | set for you by Vercel Blob |
| `AUTH_SECRET` | `openssl rand -base64 32` — **required**, the build has no default |
| `DASHBOARD_PASSWORD` | your dashboard password |

### 4. Seed the production database, once

From your machine, pointed at the production database:

```bash
DATABASE_URL="<your production URL>" npm run db:seed
```

This wipes and repopulates — run it **only** on the first deploy, never against a live store
with real orders. If you would rather start empty, skip it and add products from the dashboard;
the storefront handles an empty catalogue.

### 5. Check it

- `https://<your-app>.vercel.app` — the storefront
- `https://<your-app>.vercel.app/dashboard` — the password screen

Then change the password from **Settings → Password**, which stores a hash in the database and
retires the env value.

### Notes

- Seeded product imagery is committed SVG under `public/images/products`, so it ships with the
  build. Real uploads go to Blob.
- `next.config.mjs` only allows images from `*.public.blob.vercel-storage.com` and
  `images.unsplash.com`. Add a pattern there before serving images from anywhere else.
- Changing `AUTH_SECRET` later signs everyone out and invalidates order-access cookies.

---

## What you need to supply

Nothing to run it locally. For production:

1. **`AUTH_SECRET`** — required, signs both cookies. `openssl rand -base64 32`.
   Changing it invalidates every dashboard session and order-access cookie.
2. **`DASHBOARD_PASSWORD`** — change it before deploying, or set a real one from Settings →
   Password on first login.
3. **`DATABASE_URL`** — any PostgreSQL instance. Attaching a Vercel Postgres store sets it
   for you. Migrations in `prisma/migrations` are applied by the build.
4. **Serve it over HTTPS.** Session cookies are marked `secure` in production; over plain HTTP
   the browser will drop them and the dashboard will not stay logged in.
5. **Stripe (optional).** Checkout records a mock payment and marks the order paid. Set
   `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to switch the card form on; the
   payment step in `src/components/storefront/checkout-view.tsx` and the `paymentStatus` write
   in `src/lib/orders.ts` are where the PaymentIntent goes.
6. **Image storage.** With `BLOB_READ_WRITE_TOKEN` set, uploads go to Vercel Blob; without it
   they are written to `public/uploads` on local disk. Both paths live in
   `src/app/api/dashboard/upload/route.ts`.
7. **Email (optional).** Order confirmations are shown on screen, not sent. Hook a provider into
   `createOrder` in `src/lib/orders.ts`.

Seeded product imagery is generated SVG, on-brand but abstract. Replace it with real photography
from Dashboard → Products.

### If you later want more than one dashboard user

The single password is deliberate. To move to named accounts, add a `User` table and swap
`checkPassword` in `src/lib/dashboard-auth.ts` for a per-user lookup — the cookie, middleware and
every `requireDashboard()` call site stay as they are.

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run smoke` | Commerce core checks |
| `npm run gate` | Access-control checks |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Drop, re-migrate and re-seed |
| `npm run db:studio` | Prisma Studio |
