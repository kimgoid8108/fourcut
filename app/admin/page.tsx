"use client";

import { useEffect, useState } from "react";

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

type AuthStatus = "checking" | "loggedOut" | "loggedIn";
type SubStatus = "idle" | "subscribing" | "done" | "error";
type TestStatus = "idle" | "sending" | "sent" | "error";

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneApp(): boolean {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    iosNavigator.standalone === true
  );
}

interface AdminPhoto {
  id: string;
  imageUrl: string;
  downloadUrl: string;
  uploadedAt: string;
}

export default function AdminPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [subStatus, setSubStatus] = useState<SubStatus>("idle");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [message, setMessage] = useState("");
  const [needsHomeScreenInstall, setNeedsHomeScreenInstall] = useState(false);
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data) => setAuthStatus(data.authenticated ? "loggedIn" : "loggedOut"))
      .catch(() => setAuthStatus("loggedOut"));
  }, []);

  useEffect(() => {
    setNeedsHomeScreenInstall(isIosDevice() && !isStandaloneApp());
  }, []);

  useEffect(() => {
    if (authStatus !== "loggedIn") return;

    let cancelled = false;

    const loadPhotos = async (showLoading: boolean) => {
      if (showLoading) setPhotosLoading(true);
      try {
        const response = await fetch("/api/admin/results", { cache: "no-store" });
        const data = (await response.json()) as {
          photos?: AdminPhoto[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || "사진을 불러오지 못했습니다.");
        if (!cancelled) {
          setPhotos(data.photos ?? []);
          setPhotosError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setPhotosError(
            error instanceof Error ? error.message : "사진을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled && showLoading) setPhotosLoading(false);
      }
    };

    void loadPhotos(true);
    const interval = window.setInterval(() => void loadPhotos(false), 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [authStatus]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "로그인에 실패했어요.");
      }

      setAuthStatus("loggedIn");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "로그인에 실패했어요.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthStatus("loggedOut");
    setEmail("");
    setPassword("");
  };

  const subscribe = async () => {
    setSubStatus("subscribing");
    setTestStatus("idle");
    setMessage("");

    try {
      if (isIosDevice() && !isStandaloneApp()) {
        throw new Error(
          "iPhone/iPad에서는 Safari 공유 버튼 → 홈 화면에 추가 후, 생성된 ‘관리자 알림’ 앱에서 다시 눌러주세요.",
        );
      }

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

      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      await registration.update();

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

      setSubStatus("done");
      setMessage(
        "구독 완료! 이제 손님이 '관리자(회장님) 부르기'를 누르면 이 기기로 알림이 와요.",
      );
    } catch (err) {
      setSubStatus("error");
      setMessage(err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.");
    }
  };

  const sendTestNotification = async () => {
    setTestStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/notify", { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "시험 알림을 보내지 못했습니다.");
      }
      setTestStatus("sent");
      setMessage("시험 알림을 보냈습니다. 잠금 화면과 알림 센터를 확인해주세요.");
    } catch (error) {
      setTestStatus("error");
      setMessage(
        error instanceof Error ? error.message : "시험 알림을 보내지 못했습니다.",
      );
    }
  };

  if (authStatus === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="font-sans text-sm text-booth-dim">확인 중...</p>
      </div>
    );
  }

  if (authStatus === "loggedOut") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white px-6 text-center">
        <h1 className="font-sans text-2xl font-bold text-booth-film">
          관리자 로그인
        </h1>
        <p className="max-w-xs font-sans text-sm text-booth-dim">
          회장님만 들어올 수 있는 페이지예요. 이메일과 비밀번호를 입력해주세요.
        </p>

        <form
          onSubmit={handleLogin}
          className="flex w-full max-w-xs flex-col gap-3"
        >
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-booth-border px-4 py-3 font-sans text-sm text-booth-text outline-none focus:border-booth-film"
          />
          <input
            type="password"
            required
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-booth-border px-4 py-3 font-sans text-sm text-booth-text outline-none focus:border-booth-film"
          />
          <button
            type="submit"
            disabled={loggingIn}
            className="rounded border border-booth-film bg-booth-film px-6 py-3 font-sans text-sm font-semibold text-booth-bg transition enabled:hover:bg-booth-accent enabled:hover:border-booth-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingIn ? "확인 중..." : "로그인"}
          </button>
        </form>

        {loginError && (
          <p className="font-sans text-xs text-red-500">{loginError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white px-5 py-10">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl font-bold text-booth-film">
              양문네컷 관리자
            </h1>
            <p className="mt-1 font-sans text-xs text-booth-dim">
              노트북에서 최근 촬영 사진을 확인할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="font-sans text-[11px] text-booth-dim underline"
          >
            로그아웃
          </button>
        </header>

        <section className="rounded-2xl border border-booth-border p-5">
          <h2 className="font-sans text-base font-semibold text-booth-film">
            관리자 알림
          </h2>
          <p className="mt-2 font-sans text-xs leading-relaxed text-booth-dim">
            손님이 관리자 호출 버튼을 누르면 이 기기로 알림을 받습니다.
          </p>
          {needsHomeScreenInstall && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 font-sans text-xs leading-relaxed text-amber-800">
              iPhone/iPad는 이 페이지를 홈 화면에 추가한 뒤, 생성된 관리자
              알림 앱에서 구독해야 합니다.
            </p>
          )}
          <button
            type="button"
            onClick={subscribe}
            disabled={subStatus === "subscribing" || subStatus === "done"}
            className="mt-4 rounded border border-booth-film px-6 py-3 font-sans text-sm font-semibold text-booth-film transition enabled:hover:bg-booth-film enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {subStatus === "done" ? "구독 완료됨 ✓" : "알림 받기 시작"}
          </button>
          {subStatus === "done" && (
            <button
              type="button"
              onClick={sendTestNotification}
              disabled={testStatus === "sending"}
              className="ml-2 mt-4 rounded border border-booth-border px-6 py-3 font-sans text-sm font-semibold text-booth-text transition enabled:hover:border-booth-film disabled:opacity-50"
            >
              {testStatus === "sending" ? "보내는 중..." : "시험 알림 보내기"}
            </button>
          )}
          {message && (
            <p
              className={`mt-3 font-sans text-xs ${
                subStatus === "error" || testStatus === "error"
                  ? "text-red-500"
                  : "text-booth-dim"
              }`}
            >
              {message}
            </p>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-sans text-lg font-semibold text-booth-film">
                최근 촬영 사진
              </h2>
              <p className="mt-1 font-sans text-xs text-booth-dim">
                QR 업로드가 끝난 사진이며 10초마다 자동 갱신됩니다.
              </p>
            </div>
            <span className="font-sans text-xs text-booth-dim">
              {photos.length}장
            </span>
          </div>

          {photosLoading && (
            <p className="py-10 text-center font-sans text-sm text-booth-dim">
              사진 불러오는 중...
            </p>
          )}

          {photosError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 font-sans text-sm text-red-600">
              {photosError}
            </p>
          )}

          {!photosLoading && !photosError && photos.length === 0 && (
            <p className="rounded-xl bg-booth-muted px-4 py-10 text-center font-sans text-sm text-booth-dim">
              아직 업로드된 촬영 사진이 없습니다.
            </p>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo) => (
              <article
                key={photo.id}
                className="overflow-hidden rounded-2xl border border-booth-border bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imageUrl}
                  alt="양문네컷 촬영 결과"
                  className="aspect-[2/3] w-full bg-booth-muted object-contain"
                />
                <div className="p-4">
                  <time className="font-sans text-xs text-booth-dim">
                    {new Date(photo.uploadedAt).toLocaleString("ko-KR")}
                  </time>
                  <a
                    href={photo.downloadUrl}
                    className="mt-3 block rounded border border-booth-film px-4 py-2.5 text-center font-sans text-xs font-semibold text-booth-film transition hover:bg-booth-film hover:text-white"
                  >
                    노트북에 저장
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
