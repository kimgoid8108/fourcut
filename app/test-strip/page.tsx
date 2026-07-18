"use client";

import { useCallback, useEffect, useState } from "react";
import { useFilmStrip } from "@/hooks/useFilmStrip";

const SAMPLE_COLORS = ["#a8622f", "#4a6b8a", "#5f8a4a", "#8a4a6f"];

/**
 * 카메라 없이 필름 스트립 디자인을 확인하기 위한 테스트 페이지.
 * 실제 촬영 대신, 색깔 있는 더미 사진 4장을 캔버스로 만들어
 * composeFilmStrip()에 그대로 넣어본다.
 * 실제 카메라 플로우와 완전히 분리되어 있어서 /test-strip 페이지에만 영향을 준다.
 */
function makeSamplePhoto(index: number): string {
  const canvas = document.createElement("canvas");
  // useCamera가 요청하는 세로 비율(960x1280)과 동일하게 맞춤
  canvas.width = 960;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = SAMPLE_COLORS[index % SAMPLE_COLORS.length];
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 220px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(index + 1), canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function TestStripPage() {
  const { stripDataUrl, isComposing, error, compose } = useFilmStrip();
  const [samples, setSamples] = useState<string[]>([]);

  const generate = useCallback(() => {
    const photos = [0, 1, 2, 3].map(makeSamplePhoto);
    setSamples(photos);
    compose(photos, new Date());
  }, [compose]);

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center gap-8 bg-white px-4 py-10">
      <div className="text-center">
        <h1 className="font-sans text-2xl font-bold text-booth-film">
          필름 스트립 테스트 (카메라 불필요)
        </h1>
        <p className="mt-2 font-sans text-xs text-booth-dim">
          composeFilmStrip.ts / constants.ts 수정 후 새로고침해서 바로 확인하세요
        </p>
      </div>

      <button
        type="button"
        onClick={generate}
        className="rounded border border-booth-film px-6 py-3 font-sans text-sm font-semibold text-booth-film transition hover:bg-booth-film hover:text-booth-bg"
      >
        더미 사진 4장으로 다시 생성
      </button>

      <div className="flex flex-wrap items-start justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <p className="font-sans text-xs text-booth-dim">입력 더미 사진 4장</p>
          <div className="grid grid-cols-2 gap-2">
            {samples.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`sample-${i}`}
                className="h-24 w-[4.5rem] rounded object-cover"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="font-sans text-xs text-booth-dim">composeFilmStrip() 결과</p>
          {isComposing && (
            <p className="font-sans text-sm text-booth-dim">생성 중...</p>
          )}
          {error && (
            <p className="font-sans text-sm text-red-500">{error}</p>
          )}
          {stripDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stripDataUrl}
              alt="film strip result"
              className="max-w-xs rounded shadow-lg"
            />
          )}
        </div>
      </div>
    </div>
  );
}