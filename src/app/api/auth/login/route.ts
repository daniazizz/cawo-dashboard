import { NextResponse } from "next/server";
import { constantTimeEqual, createSessionToken } from "@/lib/auth";

const SESSION_SECONDS_DEFAULT = 60 * 60 * 8; // 8 hours
const SESSION_SECONDS_REMEMBER = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request) {
  const body = await request.json();
  const { password, rememberMe } = body as { password?: unknown; rememberMe?: unknown };

  const expectedPassword = process.env.DASHBOARD_PASSWORD;
  if (!expectedPassword) {
    return NextResponse.json(
      { error: "Server is missing DASHBOARD_PASSWORD" },
      { status: 500 },
    );
  }

  if (typeof password !== "string" || !constantTimeEqual(password, expectedPassword)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const maxAge = rememberMe ? SESSION_SECONDS_REMEMBER : SESSION_SECONDS_DEFAULT;
  const token = await createSessionToken(maxAge);

  const response = NextResponse.json({ ok: true });
  response.cookies.set("cawo_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return response;
}
