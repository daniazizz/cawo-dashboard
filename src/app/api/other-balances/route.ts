import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, amount, note } = body as { name?: unknown; amount?: unknown; note?: unknown };

  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
  }
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "amount must be a number" }, { status: 400 });
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "note must be a string" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("other_balances")
    .insert({ name, amount, note: note ?? null });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const { id } = body as { id?: unknown };

  if (typeof id !== "string" || id.trim() === "") {
    return NextResponse.json({ error: "id must be a non-empty string" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("other_balances").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
