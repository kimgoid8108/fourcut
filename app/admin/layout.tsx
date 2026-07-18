import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "양문네컷 관리자 알림",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "관리자 알림",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}