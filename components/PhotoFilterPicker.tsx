"use client";

import { PHOTO_FILTERS, type PhotoFilterId } from "@/lib/photoFilters";

interface PhotoFilterPickerProps {
  value: PhotoFilterId;
  onChange: (filter: PhotoFilterId) => void;
}

export default function PhotoFilterPicker({
  value,
  onChange,
}: PhotoFilterPickerProps) {
  return (
    <section className="w-full" aria-label="사진 필터 선택">
      <div className="mb-2 flex items-end justify-between px-1">
        <p className="font-sans text-xs font-semibold text-booth-film">
          사진 분위기
        </p>
        <p className="font-sans text-[10px] text-booth-dim">
          미리보기를 보며 골라주세요
        </p>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {PHOTO_FILTERS.map((filter) => {
            const isSelected = filter.id === value;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onChange(filter.id)}
                className={`min-w-[92px] rounded-xl border px-3 py-2.5 text-left transition ${
                  isSelected
                    ? "border-booth-film bg-booth-film text-white shadow-sm"
                    : "border-booth-border bg-white text-booth-text"
                }`}
              >
                <span className="block font-sans text-xs font-semibold">
                  {filter.label}
                </span>
                <span
                  className={`mt-0.5 block font-sans text-[9px] ${
                    isSelected ? "text-white/70" : "text-booth-dim"
                  }`}
                >
                  {filter.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
