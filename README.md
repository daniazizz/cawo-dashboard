# Ecommerce Finance Dashboard

Internal dashboard giving a single view of the business's financial position:
liquid cash (Wise), inventory value (Shopify), money owed to a 3PL (one cell in
a Google Sheet), and recurring costs. Data is synced into Supabase whenever the
dashboard is opened or the Refresh button is pressed (10s client-side
cooldown) — there is no background cron job.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres) ·
Recharts · Wise API · Shopify Admin GraphQL API · Google Sheets API

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

## Environment variables

See [`.env.example`](.env.example) for the full list. You'll need:

- A Supabase project (URL + service role key)
- A Wise personal API token + profile ID
- A Shopify Dev Dashboard app (client ID/secret) installed on the same store, in the same org, with `read_inventory` + `read_products` scopes on its version
- A Google Cloud service account with the Sheets API enabled, shared as
  Viewer on the target spreadsheet

## Database

Run [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL
editor to create the four tables (`cash_snapshots`, `inventory_snapshots`,
`liabilities`, `recurring_costs`).

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repo into Vercel (Hobby plan is enough).
3. Add every variable from `.env.example` in Project Settings → Environment
   Variables.
4. Deploy. No cron setup is needed — data refreshes when someone opens the
   app, and on demand via the Refresh button.

## Project structure

```
supabase/schema.sql            # run once in Supabase SQL editor
src/
├── app/
│   ├── page.tsx                # dashboard — client component, fetches on mount
│   ├── layout.tsx
│   └── api/overview/route.ts   # pulls Wise/Shopify/Sheets, writes a snapshot, returns aggregated JSON
├── lib/
│   ├── supabase.ts             # server-side Supabase client (service role key)
│   ├── types.ts
│   └── integrations/
│       ├── wise.ts
│       ├── shopify.ts
│       └── sheets.ts
└── components/
    ├── MetricCard.tsx
    ├── Panel.tsx
    └── RefreshButton.tsx
```

## Not yet built

- Inventory unit cost (Shopify has no native COGS field — `unit_cost` is
  currently always `null`)
- Recurring costs CRUD UI (rows must be inserted directly in Supabase)
- Trend chart (Recharts is installed, snapshots already accumulate history)
- Auth (fine for a private URL, add before sharing more broadly)
- Liabilities/inventory currency: totals are all reported in EUR (cash is
  converted live via Wise exchange rates), but liabilities and inventory
  have no currency field yet, so they're assumed to already be in EUR

