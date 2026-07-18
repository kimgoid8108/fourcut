"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function CallAdminButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setStatus("sending");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/notify", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "알림 전송에 실패했습니다.");
      }

      setStatus("sent");
      window.setTimeout(() => setStatus("idle"), 15000);
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "알림 전송에 실패했습니다.",
      );
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "sending" || status === "sent"}
        className="w-full rounded border border-booth-accent px-6 py-3 font-sans text-sm font-semibold text-booth-accent transition enabled:hover:bg-booth-accent enabled:hover:text-booth-bg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" && "호출 중..."}
        {status === "sent" && "🏃 관리자(회장님) 달려가는 중이에요!"}
        {(status === "idle" || status === "error") && "🙋 사진을 뽑고 싶으면 관리자(회장님) 부르기"}
      </button>

      {status === "error" && errorMessage && (
        <p className="font-sans text-[11px] text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}