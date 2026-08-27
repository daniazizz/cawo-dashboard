import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchRatesToEur } from "@/lib/integrations/wise";

export const dynamic = "force-dynamic";

interface HistoryPoint {
  date: string;
  cash: number;
  inventory: number;
  liabilities: number;
  otherBalances: number;
  netPosition: number;
}

// Reconstructs one data point per day the dashboard was synced, using the "latest known
// value as of that day" for each cash/inventory/liability key (snapshots are append-only).
// Two simplifications, since we don't keep historical versions of these: inventory value
// uses TODAY's product costs for all past days, and "other balances" uses today's net
// total for all past days (it's a live ad-hoc list, not a time-series).
export async function GET(request: Request) {
  try {
    return await buildHistoryResponse(request);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown server error" },
      { status: 500 },
    );
  }
}

async function buildHistoryResponse(request: Request) {
  const debug = new URL(request.url).searchParams.has("debug");
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [cashRows, inventoryRows, liabilityRows, costRows, otherBalanceRows] = await Promise.all([
    supabaseAdmin
      .from("cash_snapshots")
      .select("source, currency, amount, captured_at")
      .gte("captured_at", since.toISOString())
      .order("captured_at", { ascending: true }),
    supabaseAdmin
      .from("inventory_snapshots")
      .select("sku, product_title, quantity, captured_at")
      .gte("captured_at", since.toISOString())
      .order("captured_at", { ascending: true }),
    supabaseAdmin
      .from("liabilities")
      .select("name, amount, captured_at")
      .gte("captured_at", since.toISOString())
      .order("captured_at", { ascending: true }),
    supabaseAdmin.from("product_costs").select("product_title, unit_cost"),
    supabaseAdmin.from("other_balances").select("amount"),
  ]);

  const costByProduct = new Map<string, number>();
  for (const row of costRows.data ?? []) {
    costByProduct.set(row.product_title, Number(row.unit_cost));
  }
  const totalOtherBalances = (otherBalanceRows.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );

  const cash = cashRows.data ?? [];
  const inventory = inventoryRows.data ?? [];
  const liabilities = liabilityRows.data ?? [];

  const debugInfo = debug
    ? {
        cashRowsError: cashRows.error,
        inventoryRowsError: inventoryRows.error,
        liabilityRowsError: liabilityRows.error,
        costRowsError: costRows.error,
        otherBalanceRowsError: otherBalanceRows.error,
        cashCount: cash.length,
        inventoryCount: inventory.length,
        liabilitiesCount: liabilities.length,
        costCount: costRows.data?.length ?? 0,
        sampleInventoryTitle: inventory[0]?.product_title,
        sampleCostKeys: (costRows.data ?? []).slice(0, 3).map((r) => r.product_title),
      }
    : undefined;

  const days = Array.from(
    new Set(
      [...cash, ...inventory, ...liabilities].map((row) => dayKey(row.captured_at)),
    ),
  ).sort();

  if (days.length === 0) {
    return NextResponse.json({ points: [] as HistoryPoint[] });
  }

  const allCurrencies = Array.from(new Set(cash.map((row) => row.currency)));
  let rates: Record<string, number> = { EUR: 1 };
  try {
    rates = await fetchRatesToEur(allCurrencies);
  } catch {
    // Fall back to EUR-only conversion (non-EUR currencies excluded) if the rate lookup fails.
  }

  const latestCash = new Map<string, { currency: string; amount: number }>();
  const latestInventory = new Map<string, { productTitle: string; quantity: number }>();
  const latestLiabilities = new Map<string, number>();

  let cashIdx = 0;
  let inventoryIdx = 0;
  let liabilityIdx = 0;
  const points: HistoryPoint[] = [];

  for (const day of days) {
    const dayEnd = `${day}T23:59:59.999Z`;

    while (cashIdx < cash.length && cash[cashIdx].captured_at <= dayEnd) {
      const row = cash[cashIdx];
      latestCash.set(`${row.source}:${row.currency}`, { currency: row.currency, amount: Number(row.amount) });
      cashIdx++;
    }
    while (inventoryIdx < inventory.length && inventory[inventoryIdx].captured_at <= dayEnd) {
      const row = inventory[inventoryIdx];
      latestInventory.set(row.sku, { productTitle: row.product_title, quantity: row.quantity });
      inventoryIdx++;
    }
    while (liabilityIdx < liabilities.length && liabilities[liabilityIdx].captured_at <= dayEnd) {
      const row = liabilities[liabilityIdx];
      latestLiabilities.set(row.name, Number(row.amount));
      liabilityIdx++;
    }

    let cashTotal = 0;
    for (const { currency, amount } of latestCash.values()) {
      const rate = rates[currency];
      if (rate !== undefined) cashTotal += amount * rate;
    }

    let inventoryTotal = 0;
    for (const { productTitle, quantity } of latestInventory.values()) {
      inventoryTotal += quantity * (costByProduct.get(productTitle) ?? 0);
    }

    const liabilitiesTotal = Array.from(latestLiabilities.values()).reduce((a, b) => a + b, 0);

    points.push({
      date: day,
      cash: round2(cashTotal),
      inventory: round2(inventoryTotal),
      liabilities: round2(liabilitiesTotal),
      otherBalances: round2(totalOtherBalances),
      netPosition: round2(cashTotal + inventoryTotal - liabilitiesTotal + totalOtherBalances),
    });
  }

  return NextResponse.json({ points, ...(debugInfo ? { debugInfo } : {}) });
}

function dayKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
