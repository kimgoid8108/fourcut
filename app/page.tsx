import dynamic from "next/dynamic";

// 카메라와 브라우저 저장소를 사용하는 포토부스는 클라이언트에서만 렌더링한다.
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
