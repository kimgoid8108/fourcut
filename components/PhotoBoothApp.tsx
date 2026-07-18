"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CameraBooth from "@/components/CameraBooth";
import CallAdminButton from "@/components/CallAdminButton";
import CountdownOverlay from "@/components/CountdownOverlay";
import DownloadButton from "@/components/DownloadButton";
import FilmStrip from "@/components/FilmStrip";
import ShareQr from "@/components/ShareQr";
import ShotSelector from "@/components/ShotSelector";
import VideoDownloadButton from "@/components/VideoDownloadButton";
import { useCamera } from "@/hooks/useCamera";
import { useFilmStrip } from "@/hooks/useFilmStrip";
import { useSessionRecorder } from "@/hooks/useSessionRecorder";
import { useShotRecorder } from "@/hooks/useShotRecorder";
import { captureFrameFromVideo } from "@/lib/captureFrame";
import { createMosaicVideo } from "@/lib/createMosaicVideo";
import {
  FLASH_DURATION_MS,
  PER_SHOT_COUNTDOWN_SECONDS,
  SELECT_COUNT,
  TOTAL_CAPTURE_SHOTS,
} from "@/lib/constants";
import type { BoothPhase } from "@/lib/constants";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PhotoBoothApp() {
  const { videoRef, stream, status, errorMessage, startCamera, stopCamera } =
    useCamera({ facingMode: "user" });
  const { stripDataUrl, isComposing, error: stripError, compose, reset: resetStrip } =
    useFilmStrip();
  const { startShotRecording, stopShotRecording } = useShotRecorder();
  const { startRecording: startFullRecording, stopRecording: stopFullRecording } =
    useSessionRecorder();

  const [phase, setPhase] = useState<BoothPhase>("idle");
  const [frames, setFrames] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [shotCountdown, setShotCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [shotIndex, setShotIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mosaicVideo, setMosaicVideo] = useState<Blob | null>(null);
  const [fullSessionVideo, setFullSessionVideo] = useState<Blob | null>(null);
  const [isBuildingMosaic, setIsBuildingMosaic] = useState(false);
  const [mosaicCountdown, setMosaicCountdown] = useState<number | null>(null);
  const [finalStripDataUrl, setFinalStripDataUrl] = useState<string | null>(null);

  const abortRef = useRef(false);
  // 컷별로 따로 녹화해둔 10초 영상 클립들. shotVideosRef.current[i] = i번째 컷의 영상
  const shotVideosRef = useRef<(Blob | null)[]>([]);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const captureWithFlash = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    setFlash(true);
    await wait(FLASH_DURATION_MS);
    setFlash(false);

    if (abortRef.current) return null;
    return captureFrameFromVideo(video);
  }, [videoRef]);

  const runShotCountdown = useCallback(
    async (shotIdx: number): Promise<boolean> => {
      if (stream) {
        startShotRecording(stream);
      }

      for (let sec = PER_SHOT_COUNTDOWN_SECONDS; sec >= 1; sec -= 1) {
        if (abortRef.current) {
          await stopShotRecording();
          return false;
        }
        setShotCountdown(sec);
        await wait(1000);
      }

      setShotCountdown(null);

      const clip = await stopShotRecording();
      shotVideosRef.current[shotIdx] = clip;

      return !abortRef.current;
    },
    [stream, startShotRecording, stopShotRecording],
  );

  const captureAllShots = useCallback(async () => {
    const collected: string[] = [];

    for (let i = 0; i < TOTAL_CAPTURE_SHOTS; i += 1) {
      if (abortRef.current) break;

      setShotIndex(i);

      const ready = await runShotCountdown(i);
      if (!ready) break;

      const frame = await captureWithFlash();
      if (!frame) break;

      collected.push(frame);
      setFrames([...collected]);
    }

    return collected;
  }, [runShotCountdown, captureWithFlash]);

  const startCaptureSequence = useCallback(async () => {
    if (isRunning || status !== "ready") return;

    abortRef.current = false;
    shotVideosRef.current = [];
    setIsRunning(true);
    setPhase("capturing");
    setFrames([]);
    setSelectedIndices([]);
    setMosaicVideo(null);
    setFullSessionVideo(null);
    setFinalStripDataUrl(null);
    resetStrip();

    // 촬영 세션 전체(8컷 진행되는 동안)를 하나의 영상으로도 이어서 녹화한다
    // (컷별 짧은 클립은 같은 스트림에서 useShotRecorder가 별도로 동시에 녹화)
    if (stream) {
      startFullRecording(stream);
    }

    const sessionStart = new Date();
    const collected = await captureAllShots();

    const fullRecording = await stopFullRecording();
    if (fullRecording) {
      setFullSessionVideo(fullRecording.blob);
    }

    if (collected.length === TOTAL_CAPTURE_SHOTS && !abortRef.current) {
      setCapturedAt(sessionStart);
      setPhase("selecting");
    } else if (!abortRef.current) {
      setPhase("idle");
    }

    setShotCountdown(null);
    setFlash(false);
    setIsRunning(false);
  }, [
    isRunning,
    status,
    resetStrip,
    captureAllShots,
    stream,
    startFullRecording,
    stopFullRecording,
  ]);

  const handleConfirmSelection = useCallback(async () => {
    if (selectedIndices.length !== SELECT_COUNT || !capturedAt) return;

    const ordered = [...selectedIndices].sort((a, b) => a - b);
    const selectedFrames = ordered.map((index) => frames[index]);

    setPhase("done");
    await compose(selectedFrames, capturedAt);

    // 선택된 4컷에 해당하는 영상 클립들을, 사진과 같은 2x2 배치로
    // 동시에 재생되는 모자이크 영상 하나로 합성한다 (실시간 재생 방식이라
    // 클립 길이(약 10초)만큼 처리 시간이 걸린다).
    const clips = ordered
      .map((index) => shotVideosRef.current[index])
      .filter((clip): clip is Blob => Boolean(clip));

    if (clips.length === SELECT_COUNT) {
      setIsBuildingMosaic(true);
      try {
        const mosaic = await createMosaicVideo(clips, capturedAt);
        setMosaicVideo(mosaic);
      } catch (err) {
        console.error("모자이크 영상 생성 실패:", err);
      } finally {
        setIsBuildingMosaic(false);
      }
    }
  }, [selectedIndices, capturedAt, frames, compose]);

  const handleRetake = useCallback(() => {
    abortRef.current = true;
    setPhase("idle");
    setFrames([]);
    setSelectedIndices([]);
    setMosaicVideo(null);
    setFullSessionVideo(null);
    setIsBuildingMosaic(false);
    setFinalStripDataUrl(null);
    shotVideosRef.current = [];
    setCapturedAt(null);
    setShotCountdown(null);
    setFlash(false);
    setShotIndex(0);
    setIsRunning(false);
    resetStrip();

    // 촬영/선택 화면으로 넘어가는 동안 <video> 엘리먼트가 언마운트되어
    // 기존 스트림이 새 엘리먼트에 다시 연결되지 않는 문제가 있어서,
    // 처음으로 돌아갈 때는 항상 카메라를 완전히 껐다가 새로 켠다.
    stopCamera();
    startCamera();
  }, [resetStrip, stopCamera, startCamera]);

  useEffect(() => {
    if (!isBuildingMosaic) {
      setMosaicCountdown(null);
      return;
    }

    setMosaicCountdown(PER_SHOT_COUNTDOWN_SECONDS);
    const interval = window.setInterval(() => {
      setMosaicCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isBuildingMosaic]);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-y-auto bg-white px-4 py-8">
      <header className="relative z-10 mb-6 text-center">
        <h1 className="font-handwriting text-3xl font-bold tracking-wide text-booth-film md:text-4xl">
          양문네컷
        </h1>
        <p className="mt-2 font-sans text-xs tracking-[0.3em] text-booth-dim">
          YangMoon in Four Cuts
        </p>
      </header>

      <main className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6">
        {(phase === "idle" || phase === "capturing") && (
          <div className="relative w-full max-w-lg">
            <CameraBooth
              videoRef={videoRef}
              stream={stream}
              status={status}
              errorMessage={errorMessage}
              onRetry={startCamera}
              shotIndex={shotIndex}
              isCapturing={phase === "capturing"}
              totalShots={TOTAL_CAPTURE_SHOTS}
            />
            <CountdownOverlay shotCountdown={shotCountdown} flash={flash} />
          </div>
        )}

        {phase === "selecting" && (
          <ShotSelector
            frames={frames}
            selectedIndices={selectedIndices}
            onSelectionChange={setSelectedIndices}
            onNext={handleConfirmSelection}
            onRetake={handleRetake}
          />
        )}

        {phase === "done" && (
          <div className="flex w-full flex-col items-center gap-6">
            <FilmStrip
              dataUrl={finalStripDataUrl ?? stripDataUrl}
              isComposing={isComposing}
              error={stripError}
            />

            {isBuildingMosaic && (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-booth-border border-t-booth-film" />
                <p className="font-sans text-xs text-booth-dim">
                  모자이크 영상 합성 중
                  {mosaicCountdown !== null && mosaicCountdown > 0
                    ? ` · 약 ${mosaicCountdown}초 남음`
                    : "..."}
                </p>
              </div>
            )}

            <ShareQr
              stripDataUrl={stripDataUrl}
              videoBlob={mosaicVideo}
              fullVideoBlob={fullSessionVideo}
              onFinalImageReady={setFinalStripDataUrl}
            />
            <div className="flex w-full max-w-xs flex-col items-center gap-3">
              <CallAdminButton />
              <DownloadButton
                dataUrl={finalStripDataUrl ?? stripDataUrl}
                capturedAt={capturedAt}
              />
              <VideoDownloadButton
                videoBlob={mosaicVideo}
                capturedAt={capturedAt}
                label="영상 저장 (4컷 모자이크)"
                filenamePrefix="insaeng-neokut-mosaic"
              />
              <VideoDownloadButton
                videoBlob={fullSessionVideo}
                capturedAt={capturedAt}
                label="전체영상 저장 (8컷 전체)"
                filenamePrefix="insaeng-neokut-full"
              />
              <button
                type="button"
                onClick={handleRetake}
                className="w-full rounded border border-booth-border px-6 py-3 font-sans text-xs text-booth-text transition hover:border-booth-accent hover:text-booth-accent"
              >
                처음으로 돌아가기
              </button>
            </div>
          </div>
        )}

        {(phase === "idle" || phase === "capturing") && (
          <div className="flex w-full max-w-lg flex-col items-center gap-4">
            {phase === "idle" && (
              <>
                <p className="text-center font-sans text-xs leading-relaxed text-booth-dim">
                  컷마다 5초의 준비 시간 후 촬영됩니다.
                  <br />
                  총 8컷 · 약 40초 소요
                </p>
                <button
                  type="button"
                  onClick={startCaptureSequence}
                  disabled={status !== "ready" || isRunning}
                  className="w-full max-w-xs rounded border border-booth-film bg-transparent px-8 py-4 font-sans text-base font-semibold text-booth-film transition enabled:hover:bg-booth-film enabled:hover:text-booth-bg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  촬영 시작
                </button>
              </>
            )}

            {phase === "capturing" && (
              <p className="font-sans text-xs text-booth-dim">
                {shotIndex + 1}번째 컷 — 포즈를 준비하세요
              </p>
            )}

            {frames.length > 0 && phase === "capturing" && (
              <div className="flex gap-2">
                {Array.from({ length: TOTAL_CAPTURE_SHOTS }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-6 rounded-full transition-colors ${
                      i < frames.length ? "bg-booth-film" : "bg-booth-border"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="relative z-10 mt-8 font-sans text-[10px] tracking-widest text-booth-dim/60">
        이 페이지는 세종글꽃체를 사용하여 제작되었습니다.
      </footer>
    </div>
  );
}