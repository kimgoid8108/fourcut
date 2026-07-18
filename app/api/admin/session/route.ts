import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";

const COOKIE_NAME = "admin_session";

function expectedToken(): string | null {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  return createHash("sha256").update(`${email}:${password}`).digest("hex");
}

export async function GET(req: NextRequest) {
  const token = expectedToken();
  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;

  const authenticated = Boolean(token && cookieValue && cookieValue === token);
  return NextResponse.json({ authenticated });
}