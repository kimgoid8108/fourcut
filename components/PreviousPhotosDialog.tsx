"use client";

import type { PersistedResultSummary } from "@/lib/resultPersistence";

interface PreviousPhotosDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  selectingId: string | null;
  photos: PersistedResultSummary[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

function formatSavedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PreviousPhotosDialog({
  isOpen,
  isLoading,
  selectingId,
  photos,
  onClose,
  onSelect,
}: PreviousPhotosDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="previous-photos-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-booth-border px-5 py-4">
          <div>
            <h2
              id="previous-photos-title"
              className="font-sans text-lg font-semibold text-booth-film"
            >
              이전 사진
            </h2>
            <p className="mt-1 font-sans text-xs text-booth-dim">
              최근 촬영한 사진을 선택해주세요 · 최대 20장
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-2 font-sans text-sm text-booth-dim transition hover:bg-booth-muted"
          >
            닫기
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {isLoading ? (
            <p className="py-12 text-center font-sans text-sm text-booth-dim">
              사진을 불러오는 중...
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onSelect(photo.id)}
                  disabled={selectingId !== null}
                  className="overflow-hidden rounded-xl border border-booth-border bg-white text-left transition hover:border-booth-film hover:shadow-md disabled:opacity-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnailUrl}
                    alt={`${formatSavedAt(photo.capturedAt)}에 촬영한 사진`}
                    className="aspect-[2/3] w-full bg-booth-muted object-contain"
                  />
                  <span className="block px-2 py-2 text-center font-sans text-[11px] text-booth-dim">
                    {selectingId === photo.id
                      ? "불러오는 중..."
                      : formatSavedAt(photo.capturedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
