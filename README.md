# Ecommerce Finance Dashboard

Internal dashboard giving a single view of the business's financial position:
liquid cash (Wise + Shopify Payments), inventory value (Shopify), money owed
to a 3PL (one cell in a Google Sheet), ad-hoc receivables/payables, and
recurring costs. Data syncs into Supabase whenever the dashboard is opened,
via the Refresh button (10s client-side cooldown), and once a day at midnight
via a Vercel Cron job. Gated behind a shared-password login with an optional
"stay logged in" session.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres) ·
Recharts · Vercel Cron · Wise API · Shopify Admin GraphQL/REST API · Google Sheets API

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

## Environment variables

See [`.env.example`](.env.example) for the full list. You'll need:

- A Supabase project (URL + service role key)
- `DASHBOARD_PASSWORD` — the shared password required to log in
- `AUTH_SECRET` — any random string, used to sign session cookies (not a
  password itself — rotate it to invalidate all existing sessions)
- A Wise personal API token + profile ID
- A Shopify Dev Dashboard app (client ID/secret) installed on the same store, in the same org, with `read_inventory` + `read_products` + `shopify_payments_payouts` scopes on its version (the payouts scope only returns data for stores using Shopify Payments)
- A Google Cloud service account with the Sheets API enabled, shared as
  Viewer on the target spreadsheet
- `CRON_SECRET` — any random string; Vercel automatically sends it as
  `Authorization: Bearer $CRON_SECRET` when triggering the daily cron job, and
  `/api/cron/sync` verifies it to reject unauthorized calls to that URL

## Database

Run [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL
editor to create the four tables (`cash_snapshots`, `inventory_snapshots`,
`liabilities`, `recurring_costs`).

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repo into Vercel (Hobby plan is enough).
3. Add every variable from `.env.example` in Project Settings → Environment
   Variables.
4. Deploy. `vercel.json` defines a daily cron (`/api/cron/sync` at 00:00 UTC)
   that Vercel picks up automatically on deploy — no extra setup needed.

## Project structure

```
supabase/schema.sql            # run once in Supabase SQL editor
vercel.json                    # daily cron schedule for /api/cron/sync
src/
├── proxy.ts                         # gates every page/API request behind the session cookie
├── app/
│   ├── page.tsx                     # dashboard — client component, fetches on mount
│   ├── layout.tsx
│   ├── login/page.tsx               # password + "stay logged in" form
│   └── api/
│       ├── auth/login/route.ts      # verifies password, sets the signed session cookie
│       ├── auth/logout/route.ts     # clears the session cookie
│       ├── overview/route.ts        # on-demand sync + returns aggregated JSON
│       ├── cron/sync/route.ts       # daily cron-triggered sync (writes snapshots, logs results)
│       ├── history/route.ts         # reconstructs daily net-position history for the chart
│       ├── inventory-costs/route.ts # upserts a manually-entered per-product unit cost (COGS)
│       └── other-balances/route.ts  # add/remove ad-hoc receivables/payables
├── lib/
│   ├── supabase.ts             # server-side Supabase client (service role key)
│   ├── sync.ts                 # shared fetch-all-sources-and-write-snapshots logic
│   ├── auth.ts                 # signs/verifies session cookie tokens (Web Crypto HMAC)
│   ├── types.ts
│   └── integrations/
│       ├── wise.ts
│       ├── shopify.ts
│       └── sheets.ts
└── components/
    ├── MetricCard.tsx
    ├── Panel.tsx
    ├── InventoryPanel.tsx        # inventory grouped by product, with inline COGS editing
    ├── OtherBalancesPanel.tsx    # ad-hoc receivables/payables list with add/delete
    ├── CapitalEvolutionChart.tsx # stacked composition + net position line chart
    └── RefreshButton.tsx
```

## Not yet built

- Recurring costs CRUD UI (rows must be inserted directly in Supabase)
- Single shared password rather than per-user accounts — fine for a small
  internal team, but doesn't provide per-user audit trails
- Liabilities/inventory currency: totals are all reported in EUR (cash is
  converted live via Wise exchange rates), but liabilities and inventory
  have no currency field yet, so they're assumed to already be in EUR
- History chart approximations: inventory value and "other balances" have no
  historical versions in the database, so the evolution chart applies
  *today's* product costs and *today's* other-balances total to every past
  day. Cash and liabilities are reconstructed accurately from snapshots.
