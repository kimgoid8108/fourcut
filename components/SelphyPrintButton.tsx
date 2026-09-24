"use client";

import { useState } from "react";
import { formatCaptureTimestamp } from "@/lib/captureFrame";

interface SelphyPrintButtonProps {
  dataUrl: string | null;
  capturedAt: Date | null;
}

const UNSUPPORTED_MESSAGE =
  "공유 메뉴를 열 수 없어요. 이미지를 저장한 뒤 사진 앱에서 공유 → 프린트를 선택해주세요.";

const INSECURE_MESSAGE =
  "iPad에서 이 기능을 사용하려면 HTTPS 주소로 접속해야 해요. 이미지를 저장한 뒤 사진 앱에서 공유 → 프린트를 선택해주세요.";

export default function SelphyPrintButton({
  dataUrl,
  capturedAt,
}: SelphyPrintButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  const handleShare = async () => {
    if (!dataUrl) return;

    setMessage(null);

    if (!window.isSecureContext) {
      setMessage(INSECURE_MESSAGE);
      return;
    }

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
      // iOS 공유 시트에 이미지 파일만 전달해야 AirPrint의 "프린트" 항목과
      // 이미지 공유를 지원하는 앱이 가장 넓게 표시된다.
      const shareData: ShareData = { files: [file] };

      if (!navigator.canShare(shareData)) {
        setMessage(UNSUPPORTED_MESSAGE);
        return;
      }

      await navigator.share(shareData);
      setMessage(
        "공유 메뉴에서 ‘프린트’를 누른 뒤 Canon SELPHY CP1500을 선택해주세요.",
      );
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
      {!message && (
        <p className="text-center font-sans text-[11px] leading-relaxed text-booth-dim">
          공유 메뉴가 열리면 아래로 내려
          <br />
          <strong className="font-semibold text-booth-text">프린트</strong> → Canon
          SELPHY CP1500을 선택해주세요.
        </p>
      )}
    </div>
  );
}
