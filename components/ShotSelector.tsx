"use client";

import { useCallback, useState } from "react";
import { SELECT_COUNT, TOTAL_CAPTURE_SHOTS } from "@/lib/constants";

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
    <div className="flex w-full max-w-lg flex-col gap-5">
      <div className="text-center">
        <p className="font-sans text-lg font-semibold text-booth-film">
          {selectedIndices.length} / {SELECT_COUNT} 선택됨
        </p>
        <p className="mt-1 font-sans text-xs text-booth-dim">
          마음에 드는 {SELECT_COUNT}장을 골라 주세요
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {frames.slice(0, TOTAL_CAPTURE_SHOTS).map((frame, index) => {
          const isSelected = selectedIndices.includes(index);
          const isShaking = shakeKey === index;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleToggle(index)}
              className={`group relative aspect-[4/3] overflow-hidden rounded-sm border-2 transition-all ${
                isSelected
                  ? "border-booth-film ring-2 ring-booth-film/30"
                  : "border-booth-border hover:border-booth-accent"
              } ${isShaking ? "animate-shake" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frame}
                alt={`촬영 ${index + 1}`}
                className="h-full w-full scale-x-[-1] object-cover"
              />

              <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 font-sans text-xs font-medium text-booth-film">
                #{index + 1}
              </span>

              {isSelected && (
                <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-booth-film font-sans text-sm font-bold text-booth-bg">
                  ✓
                </span>
              )}

              <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="w-full rounded border border-booth-film bg-booth-film px-6 py-3.5 font-sans text-sm font-semibold text-booth-bg transition enabled:hover:bg-booth-accent enabled:hover:border-booth-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="w-full rounded border border-booth-border px-6 py-3 font-sans text-xs text-booth-text transition hover:border-booth-accent hover:text-booth-accent"
        >
          다시 촬영
        </button>
      </div>
    </div>
  );
}
