import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import "./globals.css";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

// 미들웨어가 심어둔 현재 경로를 보고, /admin이면 관리자 전용 매니페스트를,
// 그 외에는 메인 앱 매니페스트를 내려준다. 이렇게 서버에서 처음부터
// 올바른 <link rel="manifest">를 렌더링해야 사파리의 "홈 화면에 추가"가
// 정확한 시작 주소를 인식한다 (클라이언트에서 나중에 바꾸는 건 너무 늦다).
export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "/";
  const isAdmin = pathname.startsWith("/admin");

  return {
    title: isAdmin ? "양문네컷 관리자 알림" : "양문네컷 | Life in Four Cuts",
    description: "아이패드 전면 카메라로 촬영하는 4컷 포토부스",
    manifest: isAdmin ? "/admin/manifest.webmanifest" : "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: isAdmin ? "관리자 알림" : "양문네컷",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}