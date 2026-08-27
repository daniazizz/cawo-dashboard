import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const { productTitle, unitCost } = body as {
    productTitle?: unknown;
    unitCost?: unknown;
  };

  if (typeof productTitle !== "string" || productTitle.trim() === "") {
    return NextResponse.json(
      { error: "productTitle must be a non-empty string" },
      { status: 400 },
    );
  }
  if (
    typeof unitCost !== "number" ||
    !Number.isFinite(unitCost) ||
    unitCost < 0
  ) {
    return NextResponse.json(
      { error: "unitCost must be a non-negative number" },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("product_costs")
    .upsert({
      product_title: productTitle,
      unit_cost: unitCost,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
