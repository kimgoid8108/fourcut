import type { Metadata, Viewport } from "next";

import "./globals.css";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "인생네컷 | Life in Four Cuts",
  description: "아이패드 전면 카메라로 촬영하는 4컷 포토부스",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "인생네컷",
  },
};

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