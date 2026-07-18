"use client";

interface CameraBoothProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  status: "idle" | "requesting" | "ready" | "error";
  errorMessage: string | null;
  onRetry: () => void;
  shotIndex: number;
  isCapturing: boolean;
  totalShots?: number;
}

export default function CameraBooth({
  videoRef,
  stream,
  status,
  errorMessage,
  onRetry,
  shotIndex,
  isCapturing,
  totalShots = 8,
}: CameraBoothProps) {
    return (
      <div className="relative aspect-[4/3] w-full max-w-lg overflow-hidden rounded-sm border border-booth-border bg-black shadow-booth">
        <div className="pointer-events-none absolute inset-0 z-10 shadow-vignette" />

        {status === "ready" && stream && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-filter h-full w-full scale-x-[-1] object-cover"
          />
        )}

        {status === "requesting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-booth-muted">
            <p className="font-sans text-sm text-booth-dim">카메라 연결 중…</p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-booth-muted px-6 text-center">
            <p className="font-sans text-sm leading-relaxed text-booth-accent">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded border border-booth-border px-4 py-2 font-sans text-xs text-booth-text transition hover:border-booth-accent hover:text-booth-accent"
            >
              다시 시도
            </button>
          </div>
        )}

        {isCapturing && status === "ready" && (
          <div className="absolute bottom-3 left-3 z-20 rounded bg-black/60 px-3 py-1 font-sans text-xs tracking-wider text-booth-film">
            {shotIndex + 1} / {totalShots}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 z-20 film-grain opacity-[0.12] mix-blend-overlay" />
      </div>
    );
}
