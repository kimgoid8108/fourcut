import dynamic from "next/dynamic";

const PhotoBoothApp = dynamic(() => import("@/components/PhotoBoothApp"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center bg-booth-bg">
      <p className="font-mono text-sm text-booth-dim">포토부스 준비 중…</p>
    </div>
  ),
});

export default function HomePage() {
  return <PhotoBoothApp />;
}