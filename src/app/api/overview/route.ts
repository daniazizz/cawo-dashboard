import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchRatesToEur } from "@/lib/integrations/wise";
import { syncAllSources } from "@/lib/sync";
import type {
  CashBalance,
  InventoryItem,
  Liability,
  OtherBalance,
  OverviewResponse,
  RecurringCost,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return await buildOverviewResponse();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown server error" },
      { status: 500 },
    );
  }
}

async function buildOverviewResponse() {
  const syncResult = await syncAllSources();
  const errors = [...syncResult.errors];
  const capturedAt = syncResult.capturedAt;

  const [cash, inventory, liabilities, recurringCosts, otherBalances] = await Promise.all([
    getLatestCash(),
    getLatestInventory(),
    getLatestLiabilities(),
    getRecurringCosts(),
    getOtherBalances(),
  ]);

  // All totals are expressed in EUR. Cash is converted using live Wise rates;
  // liabilities/inventory have no currency field yet, so they're assumed to already be EUR.
  let totalCash = 0;
  const currencies = Array.from(new Set(cash.map((c) => c.currency)));
  if (currencies.length > 0) {
    try {
      const rates = await fetchRatesToEur(currencies);
      for (const c of cash) {
        const rate = rates[c.currency];
        if (rate === undefined) {
          errors.push(
            `No EUR exchange rate available for ${c.currency} — excluded from totals`,
          );
          continue;
        }
        totalCash += c.amount * rate;
      }
    } catch (err) {
      errors.push(
        `EUR conversion failed: ${err instanceof Error ? err.message : err} — cash totals may be incomplete`,
      );
    }
  }

  const totalInventoryValue = inventory.reduce(
    (sum, i) => sum + i.quantity * (i.unitCost ?? 0),
    0,
  );
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
  const totalOtherBalances = otherBalances.reduce((sum, o) => sum + o.amount, 0);
  const monthlyRecurringCosts = recurringCosts
    .filter((c) => c.active)
    .reduce((sum, c) => sum + toMonthly(c.amount, c.frequency), 0);

  const body: OverviewResponse = {
    cash,
    inventory,
    liabilities,
    recurringCosts,
    otherBalances,
    totals: {
      currency: "EUR",
      totalCash,
      totalInventoryValue,
      totalLiabilities,
      totalOtherBalances,
      netPosition: totalCash + totalInventoryValue - totalLiabilities + totalOtherBalances,
      monthlyRecurringCosts,
    },
    generatedAt: capturedAt,
    ...(errors.length > 0 ? { errors } : {}),
  };

  return NextResponse.json(body);
}

function toMonthly(
  amount: number,
  frequency: RecurringCost["frequency"],
): number {
  switch (frequency) {
    case "weekly":
      return (amount * 52) / 12;
    case "monthly":
      return amount;
    case "yearly":
      return amount / 12;
    case "one_time":
      return 0;
  }
}

async function getLatestCash(): Promise<CashBalance[]> {
  const { data, error } = await supabaseAdmin
    .from("cash_snapshots")
    .select("*")
    .order("captured_at", { ascending: false });

  if (error || !data) return [];

  const latestByKey = new Map<string, CashBalance>();
  for (const row of data) {
    const key = `${row.source}:${row.currency}`;
    if (!latestByKey.has(key)) {
      latestByKey.set(key, {
        source: row.source,
        currency: row.currency,
        amount: Number(row.amount),
        capturedAt: row.captured_at,
      });
    }
  }
  return Array.from(latestByKey.values());
}

async function getLatestInventory(): Promise<InventoryItem[]> {
  const [{ data, error }, costsResult] = await Promise.all([
    supabaseAdmin
      .from("inventory_snapshots")
      .select("*")
      .order("captured_at", { ascending: false }),
    supabaseAdmin.from("product_costs").select("product_title, unit_cost"),
  ]);

  if (error || !data) return [];

  const costByProduct = new Map<string, number>();
  for (const row of costsResult.data ?? []) {
    costByProduct.set(row.product_title, Number(row.unit_cost));
  }

  const latestByKey = new Map<string, InventoryItem>();
  for (const row of data) {
    if (!latestByKey.has(row.sku)) {
      latestByKey.set(row.sku, {
        sku: row.sku,
        productTitle: row.product_title,
        quantity: row.quantity,
        unitCost: costByProduct.get(row.product_title) ?? null,
        capturedAt: row.captured_at,
      });
    }
  }
  return Array.from(latestByKey.values());
}

async function getLatestLiabilities(): Promise<Liability[]> {
  const { data, error } = await supabaseAdmin
    .from("liabilities")
    .select("*")
    .order("captured_at", { ascending: false });

  if (error || !data) return [];

  const latestByKey = new Map<string, Liability>();
  for (const row of data) {
    if (!latestByKey.has(row.name)) {
      latestByKey.set(row.name, {
        name: row.name,
        amount: Number(row.amount),
        source: row.source,
        capturedAt: row.captured_at,
      });
    }
  }
  return Array.from(latestByKey.values());
}

async function getRecurringCosts(): Promise<RecurringCost[]> {
  const { data, error } = await supabaseAdmin
    .from("recurring_costs")
    .select("*");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    frequency: row.frequency,
    category: row.category,
    active: row.active,
  }));
}

async function getOtherBalances(): Promise<OtherBalance[]> {
  const { data, error } = await supabaseAdmin
    .from("other_balances")
    .select("*")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    note: row.note,
    createdAt: row.created_at,
  }));
}
