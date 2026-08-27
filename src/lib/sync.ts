// Shared "pull from all external sources and write snapshots" logic, used by both
// the on-demand /api/overview route and the daily /api/cron/sync job.
import { supabaseAdmin } from "@/lib/supabase";
import { fetchWiseBalances } from "@/lib/integrations/wise";
import { fetchShopifyInventory, fetchShopifyPendingPayout } from "@/lib/integrations/shopify";
import { fetch3plLiability } from "@/lib/integrations/sheets";

export interface SyncResult {
  capturedAt: string;
  errors: string[];
  counts: {
    cash: number;
    inventory: number;
    liabilities: number;
    payouts: number;
  };
}

export async function syncAllSources(): Promise<SyncResult> {
  const errors: string[] = [];
  const capturedAt = new Date().toISOString();
  const counts = { cash: 0, inventory: 0, liabilities: 0, payouts: 0 };

  const [wiseResult, shopifyResult, sheetsResult, payoutResult] = await Promise.allSettled([
    fetchWiseBalances(),
    fetchShopifyInventory(),
    fetch3plLiability(),
    fetchShopifyPendingPayout(),
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
    else counts.cash = rows.length;
    console.log("[sync] Wise balances", wiseResult.value);
  } else if (wiseResult.status === "fulfilled") {
    errors.push(
      "Wise returned no balances for this profile — check WISE_PROFILE_ID points to a profile with an open balance",
    );
  } else {
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
    else counts.inventory = rows.length;
    console.log("[sync] Shopify inventory item count", shopifyResult.value.length);
  } else if (shopifyResult.status === "rejected") {
    errors.push(`Shopify fetch failed: ${shopifyResult.reason?.message ?? shopifyResult.reason}`);
  }

  if (sheetsResult.status === "fulfilled") {
    const { error } = await supabaseAdmin.from("liabilities").insert({
      name: sheetsResult.value.name,
      amount: sheetsResult.value.amount,
      source: sheetsResult.value.source,
      captured_at: capturedAt,
    });
    if (error) errors.push(`Supabase liability insert failed: ${error.message}`);
    else counts.liabilities = 1;
    console.log("[sync] 3PL liability", sheetsResult.value);
  } else {
    errors.push(`Sheets fetch failed: ${sheetsResult.reason?.message ?? sheetsResult.reason}`);
  }

  if (payoutResult.status === "fulfilled" && payoutResult.value.length > 0) {
    const rows = payoutResult.value.map((payout) => ({
      source: payout.source,
      currency: payout.currency,
      amount: payout.amount,
      captured_at: capturedAt,
    }));
    const { error } = await supabaseAdmin.from("cash_snapshots").insert(rows);
    if (error) errors.push(`Supabase payout insert failed: ${error.message}`);
    else counts.payouts = rows.length;
    console.log("[sync] Shopify pending payout", payoutResult.value);
  } else if (payoutResult.status === "rejected") {
    errors.push(
      `Shopify payout fetch failed: ${payoutResult.reason?.message ?? payoutResult.reason}`,
    );
  }

  const result: SyncResult = { capturedAt, errors, counts };
  console.log("[sync] completed", result);
  return result;
}
