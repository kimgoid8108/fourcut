"use client";

import { useState } from "react";
import { formatCaptureTimestamp } from "@/lib/captureFrame";

interface SelphyPrintButtonProps {
  dataUrl: string | null;
  capturedAt: Date | null;
}

const UNSUPPORTED_MESSAGE =
  "이 브라우저에서는 공유가 지원되지 않아요. 이미지를 저장한 뒤 Canon PRINT 앱에서 불러와주세요.";

export default function SelphyPrintButton({
  dataUrl,
  capturedAt,
}: SelphyPrintButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  const handleShare = async () => {
    if (!dataUrl) return;

    setMessage(null);

    if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") {
      setMessage(UNSUPPORTED_MESSAGE);
      return;
    }

    try {
      const blob = await fetch(dataUrl).then((response) => response.blob());
      const timestamp = capturedAt
        ? formatCaptureTimestamp(capturedAt).replace(/[.: ]/g, "-")
        : "capture";
      const file = new File([blob], `yangmun-necut-${timestamp}.png`, {
        type: blob.type || "image/png",
      });
      const shareData: ShareData = { files: [file] };

      if (!navigator.canShare(shareData)) {
        setMessage(UNSUPPORTED_MESSAGE);
        return;
      }

      await navigator.share(shareData);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("이미지를 공유하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        disabled={!dataUrl}
        className="w-full rounded border border-booth-film bg-booth-film px-6 py-3 font-sans text-sm font-semibold text-booth-bg transition enabled:hover:border-booth-accent enabled:hover:bg-booth-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        SELPHY로 인쇄하기
      </button>
      {message && (
        <p
          role="status"
          className="text-center font-sans text-xs leading-relaxed text-booth-dim"
        >
          {message}
        </p>
      )}
    </div>
  );
}
