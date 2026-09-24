"use client";

import { useCallback, useState } from "react";
import {
  BRAND_NAME,
  SELECT_COUNT,
  TOTAL_CAPTURE_SHOTS,
} from "@/lib/constants";

interface ShotSelectorProps {
  frames: string[];
  selectedIndices: number[];
  onSelectionChange: (indices: number[]) => void;
  onNext: () => void;
  onRetake: () => void;
}

export default function ShotSelector({
  frames,
  selectedIndices,
  onSelectionChange,
  onNext,
  onRetake,
}: ShotSelectorProps) {
  const [shakeKey, setShakeKey] = useState<number | null>(null);

  const handleToggle = useCallback(
    (index: number) => {
      const isSelected = selectedIndices.includes(index);

      if (isSelected) {
        onSelectionChange(selectedIndices.filter((i) => i !== index));
        return;
      }

      if (selectedIndices.length >= SELECT_COUNT) {
        setShakeKey(index);
        window.setTimeout(() => setShakeKey(null), 400);
        return;
      }

      onSelectionChange([...selectedIndices, index]);
    },
    [selectedIndices, onSelectionChange],
  );

  const canProceed = selectedIndices.length === SELECT_COUNT;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <div className="text-center">
        <p className="font-sans text-lg font-semibold text-booth-film">
          {selectedIndices.length} / {SELECT_COUNT} 선택됨
        </p>
        <p className="mt-1 font-sans text-xs text-booth-dim">
          아래 사진을 움직여 확인하고 마음에 드는 사진을 탭해주세요
        </p>
      </div>

      <section
        aria-label="선택한 사진 미리보기"
        className="mx-auto w-full max-w-[220px]"
      >
        <p className="mb-2 text-center font-sans text-xs font-medium text-booth-dim">
          완성 미리보기
        </p>
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-white p-2 shadow-booth">
          <div className="absolute inset-x-2 bottom-12 top-2 grid grid-cols-2 grid-rows-2 gap-1.5">
            {Array.from({ length: SELECT_COUNT }).map((_, position) => {
              const frameIndex = selectedIndices[position];
              const frame =
                frameIndex === undefined ? undefined : frames[frameIndex];

              return frame ? (
                <button
                  key={`${position}-${frameIndex}`}
                  type="button"
                  onClick={() => handleToggle(frameIndex)}
                  aria-label={`선택 ${position + 1}번 사진 해제`}
                  className="relative overflow-hidden bg-black"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={frame} alt="" className="h-full w-full object-cover" />
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 font-sans text-[10px] font-semibold text-white">
                    {position + 1}
                  </span>
                </button>
              ) : (
                <div
                  key={position}
                  className="flex items-center justify-center bg-booth-muted font-sans text-base font-semibold text-booth-border"
                >
                  {position + 1}
                </div>
              );
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-12 flex-col items-center justify-center">
            <span className="font-handwriting text-base text-booth-film">
              {BRAND_NAME}
            </span>
            <span className="font-sans text-[8px] text-booth-dim">
              선택한 순서대로 배치
            </span>
          </div>
        </div>
      </section>

      <section aria-label="촬영한 사진 선택" className="w-full">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="font-sans text-xs font-medium text-booth-film">
            촬영한 사진 8장
          </p>
          <p className="font-sans text-[10px] text-booth-dim">
            손가락으로 좌우로 움직여 보세요
          </p>
        </div>

        <div className="relative -mx-4">
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-6 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-6 bg-gradient-to-l from-white to-transparent" />
          <div className="flex touch-pan-x gap-3 overflow-x-auto overscroll-x-contain px-6 pb-3 pt-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
            {frames.slice(0, TOTAL_CAPTURE_SHOTS).map((frame, index) => {
              const selectionOrder = selectedIndices.indexOf(index);
              const isSelected = selectionOrder !== -1;
              const isShaking = shakeKey === index;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleToggle(index)}
                  aria-pressed={isSelected}
                  aria-label={`촬영 ${index + 1}${
                    isSelected ? `, 선택 ${selectionOrder + 1}번` : ""
                  }`}
                  className={`relative aspect-[3/4] w-36 flex-none overflow-hidden rounded-xl border-4 bg-black shadow-md transition-all sm:w-40 md:w-44 ${
                    isSelected
                      ? "border-booth-film ring-4 ring-booth-film/20"
                      : "border-white"
                  } ${isShaking ? "animate-shake" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={frame} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 font-sans text-xs font-medium text-white">
                    #{index + 1}
                  </span>
                  {isSelected ? (
                    <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-booth-film font-sans text-base font-bold text-white">
                      {selectionOrder + 1}
                    </span>
                  ) : (
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-2 text-center font-sans text-xs font-medium text-white">
                      탭해서 선택
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onRetake}
          className="w-full rounded border border-booth-border px-6 py-3 font-sans text-xs text-booth-text transition hover:border-booth-accent hover:text-booth-accent"
        >
          처음으로 돌아가기
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="w-full rounded border border-booth-film bg-booth-film px-6 py-3.5 font-sans text-sm font-semibold text-booth-bg transition enabled:hover:border-booth-accent enabled:hover:bg-booth-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          이 사진으로 만들기
        </button>
      </div>
    </div>
  );
}
