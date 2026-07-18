"use client";

interface VideoDownloadButtonProps {
  videoBlob: Blob | null;
  capturedAt: Date | null;
  disabled?: boolean;
}

export default function VideoDownloadButton({
  videoBlob,
  capturedAt,
  disabled = false,
}: VideoDownloadButtonProps) {
  const handleDownload = () => {
    if (!videoBlob) return;

    const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = capturedAt ?? new Date();
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const url = URL.createObjectURL(videoBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `insaeng-neokut-${stamp}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={!videoBlob || disabled}
      className="w-full rounded border border-booth-film px-6 py-3 font-sans text-sm font-semibold text-booth-film transition enabled:hover:bg-booth-film enabled:hover:text-booth-bg disabled:cursor-not-allowed disabled:opacity-40"
    >
      영상 저장
    </button>
  );
}
