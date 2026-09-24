import { createHash } from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "admin_session";

export function getExpectedAdminToken(): string | null {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;

  return createHash("sha256").update(`${email}:${password}`).digest("hex");
}

export function isAdminAuthenticated(request: NextRequest): boolean {
  const token = getExpectedAdminToken();
  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return Boolean(token && cookieValue && cookieValue === token);
}
