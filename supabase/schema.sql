-- Run this once in the Supabase SQL editor to set up the schema.

create table if not exists cash_snapshots (
  id bigint generated always as identity primary key,
  source text not null,
  currency text not null,
  amount numeric not null,
  captured_at timestamptz not null default now()
);

create index if not exists cash_snapshots_source_currency_captured_at_idx
  on cash_snapshots (source, currency, captured_at desc);

create table if not exists inventory_snapshots (
  id bigint generated always as identity primary key,
  sku text not null,
  product_title text not null,
  quantity integer not null,
  unit_cost numeric,
  captured_at timestamptz not null default now()
);

create index if not exists inventory_snapshots_sku_captured_at_idx
  on inventory_snapshots (sku, captured_at desc);

create table if not exists liabilities (
  id bigint generated always as identity primary key,
  name text not null,
  amount numeric not null,
  source text not null,
  captured_at timestamptz not null default now()
);

create index if not exists liabilities_name_captured_at_idx
  on liabilities (name, captured_at desc);

create table if not exists recurring_costs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly', 'one_time')),
  category text not null,
  active boolean not null default true
);

-- Manually maintained per-product cost of goods sold, since Shopify has no native COGS field.
-- Keyed by product title (applies to every variant/SKU of that product).
create table if not exists product_costs (
  product_title text primary key,
  unit_cost numeric not null check (unit_cost >= 0),
  updated_at timestamptz not null default now()
);
