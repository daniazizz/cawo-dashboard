import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const { sku, unitCost } = body as { sku?: unknown; unitCost?: unknown };

  if (typeof sku !== "string" || sku.trim() === "") {
    return NextResponse.json({ error: "sku must be a non-empty string" }, { status: 400 });
  }
  if (typeof unitCost !== "number" || !Number.isFinite(unitCost) || unitCost < 0) {
    return NextResponse.json({ error: "unitCost must be a non-negative number" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("product_costs")
    .upsert({ sku, unit_cost: unitCost, updated_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
