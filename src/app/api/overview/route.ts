import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchWiseBalances } from "@/lib/integrations/wise";
import { fetchShopifyInventory } from "@/lib/integrations/shopify";
import { fetch3plLiability } from "@/lib/integrations/sheets";
import type {
  CashBalance,
  InventoryItem,
  Liability,
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
      { status: 500 }
    );
  }
}

async function buildOverviewResponse() {
  const errors: string[] = [];
  const capturedAt = new Date().toISOString();

  const [wiseResult, shopifyResult, sheetsResult] = await Promise.allSettled([
    fetchWiseBalances(),
    fetchShopifyInventory(),
    fetch3plLiability(),
  ]);

  if (wiseResult.status === "fulfilled" && wiseResult.value.length > 0) {
    const rows = wiseResult.value.map((balance) => ({
      source: balance.source,
      currency: balance.currency,
      amount: balance.amount,
      captured_at: capturedAt,
    }));
    const { error } = await supabaseAdmin.from("cash_snapshots").insert(rows);
    if (error) errors.push(`Supabase cash insert failed: ${error.message}`);
  } else if (wiseResult.status === "fulfilled" && wiseResult.value.length === 0) {
    errors.push("Wise returned no balances for this profile — check WISE_PROFILE_ID points to a profile with an open balance");
  } else if (wiseResult.status === "rejected") {
    errors.push(`Wise fetch failed: ${wiseResult.reason?.message ?? wiseResult.reason}`);
  }

  if (shopifyResult.status === "fulfilled" && shopifyResult.value.length > 0) {
    const rows = shopifyResult.value.map((item) => ({
      sku: item.sku,
      product_title: item.productTitle,
      quantity: item.quantity,
      unit_cost: null,
      captured_at: capturedAt,
    }));
    const { error } = await supabaseAdmin.from("inventory_snapshots").insert(rows);
    if (error) errors.push(`Supabase inventory insert failed: ${error.message}`);
  } else if (shopifyResult.status === "rejected") {
    errors.push(
      `Shopify fetch failed: ${shopifyResult.reason?.message ?? shopifyResult.reason}`
    );
  }

  if (sheetsResult.status === "fulfilled") {
    const { error } = await supabaseAdmin.from("liabilities").insert({
      name: sheetsResult.value.name,
      amount: sheetsResult.value.amount,
      source: sheetsResult.value.source,
      captured_at: capturedAt,
    });
    if (error) errors.push(`Supabase liability insert failed: ${error.message}`);
  } else {
    errors.push(`Sheets fetch failed: ${sheetsResult.reason?.message ?? sheetsResult.reason}`);
  }

  const [cash, inventory, liabilities, recurringCosts] = await Promise.all([
    getLatestCash(),
    getLatestInventory(),
    getLatestLiabilities(),
    getRecurringCosts(),
  ]);

  const totalCash = cash.reduce((sum, c) => sum + c.amount, 0);
  const totalInventoryValue = inventory.reduce(
    (sum, i) => sum + i.quantity * (i.unitCost ?? 0),
    0
  );
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
  const monthlyRecurringCosts = recurringCosts
    .filter((c) => c.active)
    .reduce((sum, c) => sum + toMonthly(c.amount, c.frequency), 0);

  const body: OverviewResponse = {
    cash,
    inventory,
    liabilities,
    recurringCosts,
    totals: {
      totalCash,
      totalInventoryValue,
      totalLiabilities,
      netPosition: totalCash + totalInventoryValue - totalLiabilities,
      monthlyRecurringCosts,
    },
    generatedAt: capturedAt,
    ...(errors.length > 0 ? { errors } : {}),
  };

  return NextResponse.json(body);
}

function toMonthly(amount: number, frequency: RecurringCost["frequency"]): number {
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
  const { data, error } = await supabaseAdmin
    .from("inventory_snapshots")
    .select("*")
    .order("captured_at", { ascending: false });

  if (error || !data) return [];

  const latestByKey = new Map<string, InventoryItem>();
  for (const row of data) {
    if (!latestByKey.has(row.sku)) {
      latestByKey.set(row.sku, {
        sku: row.sku,
        productTitle: row.product_title,
        quantity: row.quantity,
        unitCost: row.unit_cost === null ? null : Number(row.unit_cost),
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
  const { data, error } = await supabaseAdmin.from("recurring_costs").select("*");

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
