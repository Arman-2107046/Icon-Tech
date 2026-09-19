# Icon Tech

A complete e-commerce platform for a Bangladeshi tech-accessories store: a fast, designed storefront, a full admin, cash-on-delivery checkout, and everything in between — built on Next.js 16 (App Router, Cache Components), React 19, Prisma 7 on PostgreSQL, and Tailwind CSS v4.

## What's inside

**Storefront** — home page assembled from admin-configured sections, collections with faceted filters and sorting, product pages with variant picker, gallery and hover zoom, full-text search (Postgres `tsvector` + trigram typo fallback) with an instant-search dropdown, a spring-animated cart drawer, and a four-step checkout (contact → address → delivery → payment) with discount codes, inventory holds and cash on delivery. Magic-link customer accounts with order history and an address book. Open Graph images, sitemap, robots, redirects, JSON-LD, designed empty/loading/error states, scroll reveals that honour `prefers-reduced-motion`.

**Admin** (`/admin`) — dashboard (revenue, orders, AOV, awaiting action, low stock, 30-day chart), products with options/variant matrix, inventory and media (drag-to-reorder, blurhash placeholders), collections (manual or rule-based), discounts, orders (mark paid, fulfil with tracking, refund, cancel, invoice, timeline, internal notes), customers, pages, menus, shipping zones/rates and tax rates, site settings and homepage sections, CSV import/export. Light/dark/system theme.

**Platform** — module boundaries enforced by ESLint, every mutation a Server Action returning `{ ok, data } | { ok, error, fieldErrors }`, money always in integer minor units, hashed-token cookie sessions (admin + customer), signed guest-cart cookie, transactional order creation with inventory reservations, transactional email outbox (React Email + Resend), cron routes for housekeeping, unit + end-to-end tests, and a CI performance budget.

## Requirements

- Node.js 22 (20+ works)
- PostgreSQL 14+ (the search migration enables the `pg_trgm` extension)

## Setup

```bash
git clone https://github.com/Arman-2107046/Icon-Tech.git
cd Icon-Tech
npm install
cp .env.example .env        # then fill in the values below
npx prisma migrate deploy   # create the schema (or `npm run db:migrate` in development)
npm run db:seed             # demo catalogue, collections, customers, orders, admin user
npm run dev                 # http://localhost:3000
```

The seed creates an admin login: **admin@icontech.com.bd / admin12345** (change it after first sign-in in a real deployment). Seeded product images come from picsum.photos; the seed also computes their blurhash placeholders, which needs network access. If you skip that, run `npm run db:blurhash` later.

### Environment variables

Validated at boot by [`src/lib/env.ts`](src/lib/env.ts); the app refuses to start with a clear message if something is missing.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string used by Prisma. |
| `SESSION_SECRET` | yes | Signs session and guest-cart cookies. 32+ random characters (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). |
| `NEXT_PUBLIC_SITE_URL` | recommended | Public origin, no trailing slash. Used for canonical URLs, sitemap, OG images and magic-link emails. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_STORE_CURRENCY` | no | `BDT` (default) or `USD`. |
| `CRON_SECRET` | production | Bearer token your scheduler sends to `/api/cron/*`. |
| `RESEND_API_KEY` | production | Sends transactional email. Without it queued emails are marked `SKIPPED` and, in development, magic links are shown on the login page. |

Payments are cash on delivery and uploads are stored on local disk under `public/uploads/`, so there are no gateway or object-storage keys.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload. |
| `npm run build` / `npm run start` | Production build / serve. |
| `npm run lint` | ESLint (module boundaries, no `any`, hard-coded colour guard) + colour-token check. |
| `npm test` | Unit tests (Vitest): money and totals, discount stacking, inventory holds, order state machine, collection rules, CSV, sessions… |
| `npm run test:e2e` | Playwright end-to-end tests (desktop + mobile) against a dev server on port 3100. |
| `npm run db:migrate` | Create/apply a migration in development. |
| `npm run db:seed` | Seed demo data (idempotent for the admin user). |
| `npm run db:reset` | Drop, migrate and reseed. |
| `npm run db:studio` | Prisma Studio. |
| `npm run db:blurhash` | Compute blurhash placeholders for media rows that lack one. |
| `npm run check:bundle -- <baseUrl>` | Gzipped client-JS budget for the product page (run against `next start`). |
| `npm run lighthouse` | Lighthouse CI budget run (`lighthouserc.cjs`). |

## Project structure

```
app/
  (storefront)/        home, collections, products, pages, search, 404, error boundary
  (checkout)/          checkout steps and order confirmation (no site chrome)
  account/             magic-link login, orders, addresses
  admin/               admin login and every admin screen
  api/                 media upload, CSV import/export, cron routes
src/
  modules/<name>/      one folder per domain: catalog, cart, checkout, orders,
                       discounts, customers, content. Each has queries.ts (server),
                       actions.ts ("use server"), types.ts (browser-safe),
                       schemas.ts (zod), index.ts (the only import path for others)
  storefront/          storefront components, cart drawer, checkout UI, motion
  admin/               admin components (shadcn on Base UI), features, hooks
  lib/                 env, db, auth (sessions, magic links), money, cache tags,
                       email outbox + sender, csv, blurhash, storage
  emails/              React Email templates
prisma/
  schema/*.prisma      multi-file schema; migrations/ ; seed/ (demo data)
tests/unit, tests/e2e  Vitest and Playwright
scripts/               colour lint, bundle budget, blurhash backfill
.github/workflows/     CI: lint, unit tests, build, JS budget, Lighthouse, e2e
```

Design tokens live in [`app/tokens.css`](app/tokens.css) (spacing, radii, shadows, type scale, colours); ESLint and `scripts/check-colors.mjs` fail the build on hard-coded colours anywhere else.

## Background jobs

Two routes do housekeeping and expect `Authorization: Bearer $CRON_SECRET`:

| Route | Schedule | Purpose |
| --- | --- | --- |
| `POST /api/cron/release-reservations` | every 5 minutes | Frees inventory holds older than 30 minutes (`{ "olderThanMinutes": n }` overrides). |
| `POST /api/cron/send-emails` | every minute | Sends queued transactional emails from the outbox with retries. |

Point any scheduler at them (Vercel Cron, GitHub Actions, cron + curl).

## Deployment

1. Provision PostgreSQL and set the environment variables above (`NODE_ENV=production`).
2. `npm ci && npx prisma migrate deploy && npm run build`.
3. Run `npm run start` behind your reverse proxy (or deploy to any host that runs Next.js 16; the image optimiser uses `sharp`, which is installed).
4. Persist `public/uploads/` (media is stored on disk) — mount a volume or back it up.
5. Schedule the two cron routes.
6. Sign in at `/admin`, change the admin password, set the store details, email sender and shipping zones under **Settings** / **Shipping**.

CI (`.github/workflows/ci.yml`) runs lint, unit tests, the production build, the 180 KB gzipped product-page JS budget, Lighthouse CI (LCP < 2.0 s, CLS < 0.05, TBT < 200 ms) and the Playwright suite on every push and pull request.

## License

Private.
