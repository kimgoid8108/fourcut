import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 현재 요청 경로를 헤더로 심어서, 루트 레이아웃(generateMetadata)에서
// 이 경로를 보고 /admin이면 관리자 전용 매니페스트를 내려줄 수 있게 한다.
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
