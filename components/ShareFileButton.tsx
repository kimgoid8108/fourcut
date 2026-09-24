"use client";

import { useState } from "react";

interface ShareFileButtonProps {
  url: string;
  label: string;
  filenamePrefix: string;
}

type SaveStatus = "idle" | "preparing" | "ready" | "error";

function getExtension(blob: Blob, url: string): string {
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("webm")) return "webm";
  if (blob.type.includes("png")) return "png";
  if (blob.type.includes("jpeg")) return "jpg";

  const pathname = new URL(url, window.location.href).pathname;
  const extension = pathname.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : "bin";
}

export default function ShareFileButton({
  url,
  label,
  filenamePrefix,
}: ShareFileButtonProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  const saveFile = async () => {
    if (status === "preparing") return;

    setStatus("preparing");
    setMessage("파일을 준비하고 있어요...");

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("파일을 불러오지 못했습니다.");

      const blob = await response.blob();
      const extension = getExtension(blob, url);
      const file = new File(
        [blob],
        `${filenamePrefix}-${Date.now()}.${extension}`,
        { type: blob.type || "application/octet-stream" },
      );
      const shareData: ShareData = { files: [file] };

      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare(shareData)
      ) {
        await navigator.share(shareData);
        setStatus("ready");
        setMessage("공유 메뉴에서 저장 위치를 선택해주세요.");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.name;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

      setStatus("ready");
      setMessage("다운로드를 시작했습니다.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        setMessage("");
        return;
      }

      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "저장 준비 중 문제가 발생했습니다. 다시 시도해주세요.",
      );
    }
  };

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-2">
      <button
        type="button"
        onClick={saveFile}
        disabled={status === "preparing"}
        className="w-full rounded-lg border border-booth-film bg-booth-film px-5 py-3 font-sans text-sm font-semibold text-white transition enabled:active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
      >
        {status === "preparing" ? "준비 중..." : label}
      </button>
      {message && (
        <p
          className={`text-center font-sans text-xs ${
            status === "error" ? "text-red-500" : "text-booth-dim"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
