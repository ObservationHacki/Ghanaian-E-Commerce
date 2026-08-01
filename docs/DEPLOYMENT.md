# VBUY production deployment checklist

Stack: Vite storefront (`artifacts/store`) + Express API (`artifacts/api-server`) + Neon Postgres + Supabase Auth (JWT only). This is not Next.js.

## Host: Vercel (recommended)

Single Vercel project serves the store SPA and the Express API as a serverless function (`api/index.mjs` → bundled `vercel-entry`). Same-origin `/api/*` keeps working.

### Deploy

```bash
# From repo root (requires Vercel account + CLI login)
npx vercel          # preview
npx vercel --prod   # production
```

Or connect the GitHub repo in the Vercel dashboard (Root Directory = repo root; uses [`vercel.json`](../vercel.json)).

### Environment variables (Vercel Project → Settings → Environment Variables)

Set for **Production** (and Preview if you use it). Build-time vars must be available at build:

| Variable | Runtime | Build | Notes |
|----------|---------|-------|--------|
| `DATABASE_URL` | API | | Neon; prefer pooler `sslmode=require` |
| `SUPABASE_URL` | API | Store | |
| `SUPABASE_ANON_KEY` | | Store | Public anon key |
| `SUPABASE_JWT_SECRET` | API | | |
| `ADMIN_EMAILS` | API | | |
| `VITE_MOMO_MERCHANT_NUMBER` | API via store-config | Store | |
| `GHS_ACCRA_DELIVERY_FEE` | API | | Required for checkout |
| `GHS_OUTSIDE_ACCRA_DELIVERY_FEE` | API | | Required for checkout |
| `CORS_ORIGINS` | API | | Your Vercel URL(s), e.g. `https://vbuy.vercel.app` (same-origin still fine; set when using a custom domain / preview) |
| `CRON_SECRET` | API | | Must match Vercel Cron auth; also used as `Authorization: Bearer` |
| `VITE_TURNSTILE_SITE_KEY` | | Store | |
| `TURNSTILE_SECRET_KEY` | API | | Required in production |
| `VITE_CONTACT_PHONE` / `EMAIL` / `WHATSAPP` | | Store | |
| `BASE_PATH` | | Store | Use `/` (also set in `vercel.json` buildCommand) |
| `NODE_ENV` | | | Vercel sets `production` |

After the first deploy, set `CORS_ORIGINS` to the exact production origin (and custom domain if any), then redeploy.

### Vercel Cron

[`vercel.json`](../vercel.json) schedules `GET /api/internal/expire-unpaid-orders` daily at 03:00 UTC. Hobby plans allow at most one run per day. Ensure `CRON_SECRET` is set — Vercel sends `Authorization: Bearer <CRON_SECRET>`.

### Supabase Auth URLs

Add `https://YOUR-VERCEL-HOST/auth/callback` under Authentication → URL Configuration.

## Secrets (host env / secret store — never commit)

| Variable | Where | Notes |
|----------|--------|--------|
| `DATABASE_URL` | API / drizzle | Neon with `sslmode=require` |
| `SUPABASE_URL` | API + store build | Same project URL |
| `SUPABASE_ANON_KEY` | Store build | Public anon key only |
| `SUPABASE_JWT_SECRET` | API | Project JWT secret |
| `ADMIN_EMAILS` | API | Bootstrap super-admins |
| `VITE_MOMO_MERCHANT_NUMBER` or `MOMO_MERCHANT_NUMBER` | Store build + API | Shown at checkout via `/api/store-config` |
| `CORS_ORIGINS` | API | Comma-separated production origins (required when `NODE_ENV=production`) |
| `CRON_SECRET` | API | For unpaid-order expiry job |
| `UNPAID_ORDER_EXPIRY_HOURS` | API | Default `24` |
| `VITE_CONTACT_PHONE` / `VITE_CONTACT_EMAIL` / `VITE_CONTACT_WHATSAPP` | Store build | Real contact details (replace placeholders) |
| `VITE_TURNSTILE_SITE_KEY` | Store build | Cloudflare Turnstile site key (public) |
| `TURNSTILE_SECRET_KEY` | API | Cloudflare Turnstile secret (never expose to browser) |
| `GHS_ACCRA_DELIVERY_FEE` | API | Flat delivery fee for Accra zone (GHS) |
| `GHS_OUTSIDE_ACCRA_DELIVERY_FEE` | API | Flat delivery fee outside Accra (GHS) |

Paystack client/API routes are removed. Historical `paystack` enum values may still exist on old order rows.

## Cloudflare Turnstile

Checkout order creation and MoMo reference submission require a Turnstile token when `TURNSTILE_SECRET_KEY` is set. If the secret is unset, the API logs a startup warning and skips verification (local dev only — never leave this unset in production).

### Verify `.env` was never committed

```bash
git log --all --full-history -- .env .env.local
```

If any history exists, rotate all secrets before go-live.

## Supabase dashboard (manual)

1. Authentication → URL Configuration: add `https://YOUR-HOST/auth/callback` (and local for dev).
2. Enable Google (or other) providers you use.
3. Confirm email rate limits / confirmation settings for production.

## CORS

Set `CORS_ORIGINS` to your storefront origin(s). With `NODE_ENV=production` and an empty list, browser cross-origin calls are denied.

Local `.env.example` suggests `CORS_ORIGINS=http://localhost:5173`. Add your production origin before deploy.

## Unpaid MoMo order expiry (manual scheduler)

Endpoint:

```http
POST /api/internal/expire-unpaid-orders
X-Cron-Secret: <CRON_SECRET>
```

Optional query: `?hours=24` (or set `UNPAID_ORDER_EXPIRY_HOURS`).

Cancels `momo_manual` orders still `paymentStatus=pending` and `status=order_received` older than the cutoff, and **releases reserved stock**.

Wire a host cron (Railway cron, Render cron, cron-job.org, GitHub Actions, etc.) every **15–60 minutes**.

Example (cron-job.org / curl):

```bash
curl -X POST "https://YOUR-API-HOST/api/internal/expire-unpaid-orders" \
  -H "X-Cron-Secret: $CRON_SECRET"
```

Set `CRON_SECRET` in the API host env before enabling the job.

## Stock reservation

- Stock is **decremented when an order is placed** (transactional; fails with 400 if insufficient).
- Stock is **restored** when an unpaid order (`pending` / `submitted`) is cancelled by admin or by the expiry job.
- Verified/paid orders that are later cancelled do **not** auto-restore stock (handle manually if needed).

## MoMo duplicate references

Submitting a MoMo reference already used on another order returns **409**. There is a unique DB index on `orders.momo_reference`.

## Delivery fees

Checkout requires a delivery zone (`accra` | `outside_accra`). The API snapshots `deliveryFee` + `deliveryRegion` and sets `total = subtotal + deliveryFee`. Both fee env vars must be set to non-negative numbers or order creation is blocked.

## Contact placeholders

Until you set `VITE_CONTACT_*`, the info pages show obvious placeholders (`+233 XX XXX XXXX`, `hello@example.com`). Set real values in the store build env before launch.

## Still open (non-blocking / business)

1. **Sentry / error tracking** — not installed.
2. **Legal pages** — Privacy / Terms marked DRAFT; have counsel review.
3. **Footer social URLs** — update Instagram/Facebook/X links when ready.

## Build & run (typical)

```bash
# API
cd artifacts/api-server && node ./build.mjs && node --enable-source-maps --env-file-if-exists=../../.env ./dist/index.mjs

# Store (production build needs BASE_PATH, SUPABASE_*, VITE_MOMO_MERCHANT_NUMBER)
cd artifacts/store && pnpm build && pnpm serve
```

Push schema after pulling unique MoMo index:

```bash
cd lib/db && npx drizzle-kit push --config ./drizzle.config.ts
```

If push fails on the unique index, clear or merge duplicate `momo_reference` values first.
