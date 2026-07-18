"use client";

import { useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type Status = "idle" | "subscribing" | "done" | "error";

export default function AdminPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const subscribe = async () => {
    setStatus("subscribing");
    setMessage("");

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("이 브라우저는 푸시 알림을 지원하지 않아요.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("알림 권한이 거부되었어요. 설정에서 알림을 허용해주세요.");
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("VAPID 공개키가 설정되지 않았어요. 관리자에게 문의하세요.");
      }

      const registration = await navigator.serviceWorker.ready;

      // 기존 구독이 있으면 정리하고 새로 구독 (기기를 바꿨을 때 대비)
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const res = await fetch("/api/admin/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) {
        throw new Error("구독 정보 저장에 실패했어요.");
      }

      setStatus("done");
      setMessage(
        "구독 완료! 이제 청년들이 '관리자(회장님) 부르기'를 누르면 이 기기로 알림이 와요.",
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.");
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <h1 className="font-sans text-2xl font-bold text-booth-film">
        관리자 알림 설정
      </h1>
      <p className="max-w-xs font-sans text-sm text-booth-dim">
        회장님 폰에서 이 페이지를 열고 아래 버튼을 눌러주세요.
        <br />
        한 번 구독해두면, 청년들이 도움을 요청할 때마다 이 기기로 알림이 와요.
      </p>

      <button
        type="button"
        onClick={subscribe}
        disabled={status === "subscribing" || status === "done"}
        className="rounded border border-booth-film px-8 py-4 font-sans text-base font-semibold text-booth-film transition enabled:hover:bg-booth-film enabled:hover:text-booth-bg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "done" ? "구독 완료됨 ✓" : "알림 받기 시작"}
      </button>

      {message && (
        <p
          className={`max-w-xs font-sans text-xs ${
            status === "error" ? "text-red-500" : "text-booth-dim"
          }`}
        >
          {message}
        </p>
      )}

      <p className="mt-4 font-sans text-[10px] text-booth-dim/60">
        다른 기기로 바꾸고 싶으면, 그 기기에서 이 페이지를 열고 다시 구독하면 돼요.
      </p>
    </div>
  );
}