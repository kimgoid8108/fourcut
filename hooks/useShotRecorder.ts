"use client";

import { useCallback, useRef } from "react";

const CANDIDATE_MIME_TYPES = [
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

interface UseShotRecorderResult {
  startShotRecording: (stream: MediaStream) => void;
  stopShotRecording: () => Promise<Blob | null>;
}

/**
 * 컷 하나(10초 카운트다운)씩 짧은 영상 클립으로 따로 녹화한다.
 * 나중에 선택된 4컷에 해당하는 클립 4개만 모아서 모자이크 영상을 만든다.
 */
export function useShotRecorder(): UseShotRecorderResult {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef<string>("video/webm");

  const startShotRecording = useCallback((stream: MediaStream) => {
    const mimeType = pickSupportedMimeType();
    if (!mimeType) return;

    mimeTypeRef.current = mimeType;
    chunksRef.current = [];

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 3_000_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(250);
      recorderRef.current = recorder;
    } catch (err) {
      console.error("컷 영상 녹화 시작 실패:", err);
      recorderRef.current = null;
    }
  }, []);

  const stopShotRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        chunksRef.current = [];
        recorderRef.current = null;
        resolve(blob.size > 0 ? blob : null);
      };

      recorder.stop();
    });
  }, []);

  return { startShotRecording, stopShotRecording };
}
