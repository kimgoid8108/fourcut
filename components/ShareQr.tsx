"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { upload } from "@vercel/blob/client";
import { overlayQrOnStrip } from "@/lib/overlayQrOnStrip";

type Status = "idle" | "uploading" | "ready" | "error";

interface ShareQrProps {
  stripDataUrl: string | null;
  videoBlob: Blob | null;
  fullVideoBlob: Blob | null;
  onFinalImageReady?: (dataUrl: string) => void;
}

function uploadVideo(blob: Blob, prefix: string) {
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  return upload(`strips/${prefix}-${Date.now()}.${ext}`, blob, {
    access: "public",
    handleUploadUrl: "/api/share/video-token",
    contentType: blob.type || `video/${ext}`,
  });
}

export default function ShareQr({
  stripDataUrl,
  videoBlob,
  fullVideoBlob,
  onFinalImageReady,
}: ShareQrProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!stripDataUrl || !videoBlob || !fullVideoBlob) return;

    let cancelled = false;

    (async () => {
      try {
        setStatus("uploading");

        // 영상 2개(모자이크, 전체 세션): 브라우저에서 Vercel Blob으로 직접 업로드
        // (서버 함수의 요청 용량 제한을 우회해서 고화질 그대로 올릴 수 있다)
        const mosaicUploadPromise = uploadVideo(videoBlob, "mosaic");
        const fullUploadPromise = uploadVideo(fullVideoBlob, "full");

        // 이미지: 용량이 작아서 기존 서버 라우트를 통해 업로드
        const imageUploadPromise = fetch("/api/share", {
          method: "POST",
          body: (() => {
            const form = new FormData();
            form.append("image", stripDataUrl);
            return form;
          })(),
        }).then(async (res) => {
          if (!res.ok) throw new Error("이미지 업로드 실패");
          return res.json() as Promise<{ imageUrl: string }>;
        });

        const [mosaicResult, fullResult, imageResult] = await Promise.all([
          mosaicUploadPromise,
          fullUploadPromise,
          imageUploadPromise,
        ]);

        if (cancelled) return;

        const shareUrl =
          `${window.location.origin}/share?img=${encodeURIComponent(imageResult.imageUrl)}` +
          `&video=${encodeURIComponent(mosaicResult.url)}` +
          `&fullvideo=${encodeURIComponent(fullResult.url)}`;

        const qr = await QRCode.toDataURL(shareUrl, {
          margin: 1,
          width: 320,
        });

        if (cancelled) return;

        setQrDataUrl(qr);
        setStatus("ready");

        // 완성된 사진 우측 하단에 QR을 겹쳐서, 인쇄본에도 QR이 찍혀 나오게 한다
        if (onFinalImageReady) {
          try {
            const finalImage = await overlayQrOnStrip(stripDataUrl, qr);
            if (!cancelled) {
              onFinalImageReady(finalImage);
            }
          } catch (overlayErr) {
            console.error("QR 합성 실패:", overlayErr);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : "QR코드 생성에 실패했습니다.",
          );
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stripDataUrl, videoBlob, fullVideoBlob]);

  if (status === "idle") return null;

  return (
    <div className="flex flex-col items-center gap-2">
      {status === "uploading" && (
        <p className="font-sans text-xs text-booth-dim">
          사진·영상 업로드 중...
        </p>
      )}

      {status === "error" && (
        <p className="font-sans text-xs text-red-500">{errorMessage}</p>
      )}

      {status === "ready" && qrDataUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="다운로드 QR코드" className="h-40 w-40" />
          <p className="font-sans text-xs text-booth-dim">
            폰 카메라로 스캔해서 사진·영상·전체영상 받아가세요
          </p>
          <p className="font-sans text-[10px] text-booth-dim/70">
            촬영일 포함 3일간 다운로드 가능
          </p>
        </>
      )}
    </div>
  );
}