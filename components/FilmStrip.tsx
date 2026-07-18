"use client";

interface FilmStripProps {
  dataUrl: string | null;
  isComposing: boolean;
  error: string | null;
}

export default function FilmStrip({ dataUrl, isComposing, error }: FilmStripProps) {
  if (isComposing) {
    return (
      <div className="flex h-64 w-full max-w-xs items-center justify-center">
        <p className="font-sans text-sm text-booth-dim">필름 인화 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 w-full max-w-xs items-center justify-center px-4 text-center">
        <p className="font-sans text-sm text-red-400/80">{error}</p>
      </div>
    );
  }

  if (!dataUrl) return null;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-4 rounded-sm bg-black/50 blur-xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="인생네컷 필름 스트립"
        className="relative max-h-[70vh] w-auto max-w-full rounded-sm shadow-booth"
      />
      <div className="pointer-events-none absolute inset-0 film-grain opacity-[0.08] mix-blend-overlay" />
    </div>
  );
}
