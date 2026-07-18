import { NextResponse } from "next/server";

export const dynamic = "force-static";

// Next.js의 manifest.ts 파일 규칙은 루트(app/manifest.ts)에서만 동작해서,
// /admin 전용 매니페스트는 이렇게 직접 라우트 핸들러로 만든다.
export async function GET() {
  return NextResponse.json(
    {
      name: "인생네컷 관리자 알림",
      short_name: "관리자 알림",
      description: "손님 호출 알림을 받는 관리자 전용 페이지",
      start_url: "/admin",
      display: "standalone",
      orientation: "portrait",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      icons: [
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
      },
    },
  );
}