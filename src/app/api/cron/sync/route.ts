import { NextResponse } from "next/server";
import { syncAllSources } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Triggered by Vercel Cron once a day. Vercel signs the request with
// `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set, so we verify that
// here to stop this endpoint being triggered by anyone who finds the URL.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await syncAllSources();
  console.log("[cron] daily sync result", JSON.stringify(result));

  return NextResponse.json(result);
}
