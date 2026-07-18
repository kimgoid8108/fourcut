import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30일

function expectedToken(): string | null {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  return createHash("sha256").update(`${email}:${password}`).digest("hex");
}

export async function POST(req: NextRequest) {
  const token = expectedToken();
  if (!token) {
    return NextResponse.json(
      { error: "관리자 계정이 설정되지 않았습니다 (ADMIN_EMAIL/ADMIN_PASSWORD 누락)." },
      { status: 500 },
    );
  }

  try {
    const { email, password } = await req.json();

    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}