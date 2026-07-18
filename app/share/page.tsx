"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ShareContent() {
  const params = useSearchParams();
  const img = params.get("img");
  const video = params.get("video");

  if (!img && !video) {
    return (
      <p className="font-sans text-sm text-booth-dim">
        잘못된 링크이거나, 3일이 지나 만료된 링크예요.
      </p>
    );
  }

  return (
    <>
      {img && (
        <a href={img} download className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt="양문네컷 필름 스트립"
            className="max-w-xs rounded shadow-lg"
          />
          <span className="font-sans text-xs text-booth-dim">
            사진 저장하기 (탭)
          </span>
        </a>
      )}

      {video && (
        <div className="flex flex-col items-center gap-2">
          <video
            src={video}
            controls
            playsInline
            className="max-w-xs rounded shadow-lg"
          />
          <a
            href={video}
            download
            className="font-sans text-xs text-booth-dim underline"
          >
            영상 저장하기 (탭)
          </a>
        </div>
      )}
    </>
  );
}

export default function SharePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-8 bg-white px-4 py-10">
      <h1 className="font-sans text-3xl font-bold text-booth-film">
        양문네컷
      </h1>
      <Suspense
        fallback={
          <p className="font-sans text-sm text-booth-dim">불러오는 중...</p>
        }
      >
        <ShareContent />
      </Suspense>
      <p className="font-sans text-[10px] text-booth-dim/60">
        촬영일 포함 3일간 다운로드 가능하며, 이후 자동 삭제됩니다.
      </p>
    </div>
  );
}
