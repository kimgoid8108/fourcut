"use client";

import { downloadDataUrl, formatCaptureTimestamp } from "@/lib/captureFrame";

interface DownloadButtonProps {
  dataUrl: string | null;
  capturedAt: Date | null;
  disabled?: boolean;
}

export default function DownloadButton({
  dataUrl,
  capturedAt,
  disabled = false,
}: DownloadButtonProps) {
  const handleDownload = () => {
    if (!dataUrl) return;

    const timestamp = capturedAt
      ? formatCaptureTimestamp(capturedAt).replace(/[.: ]/g, "-")
      : "capture";
    downloadDataUrl(dataUrl, `insaeng-neokut-${timestamp}.png`);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={!dataUrl || disabled}
      className="rounded border border-booth-film bg-booth-film px-6 py-3 font-sans text-sm font-semibold text-booth-bg transition enabled:hover:bg-booth-accent enabled:hover:border-booth-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      PNG 저장
    </button>
  );
}