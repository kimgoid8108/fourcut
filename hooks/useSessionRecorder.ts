"use client";

import { useCallback, useRef } from "react";

// 아이패드 사파리는 webm을 지원 안 하는 경우가 많아서, 지원하는 포맷을
// 순서대로 확인해서 첫 번째로 되는 걸 쓴다.
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

interface UseSessionRecorderResult {
  isSupported: boolean;
  startRecording: (stream: MediaStream) => void;
  stopRecording: () => Promise<{ blob: Blob; mimeType: string } | null>;
}

/**
 * 촬영 세션 전체(8컷 진행되는 동안)를 하나의 영상으로 이어서 녹화한다.
 * 실제 인생네컷/포토이즘 부스처럼, 선택된 사진과 무관하게 세션 전체를 그대로 담는다.
 */
export function useSessionRecorder(): UseSessionRecorderResult {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef<string>("video/webm");

  const isSupported =
    typeof window !== "undefined" && typeof MediaRecorder !== "undefined";

  const startRecording = useCallback((stream: MediaStream) => {
    if (!isSupported) return;

    const mimeType = pickSupportedMimeType();
    if (!mimeType) return;

    mimeTypeRef.current = mimeType;
    chunksRef.current = [];

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 1_500_000, // 클라이언트 직접 업로드로 용량 제한이 없어져서 화질 위주로 설정
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(1000); // 1초마다 청크 저장
      recorderRef.current = recorder;
    } catch (err) {
      console.error("MediaRecorder 시작 실패:", err);
      recorderRef.current = null;
    }
  }, [isSupported]);

  const stopRecording = useCallback((): Promise<{
    blob: Blob;
    mimeType: string;
  } | null> => {
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
        resolve(blob.size > 0 ? { blob, mimeType: mimeTypeRef.current } : null);
      };

      recorder.stop();
    });
  }, []);

  return { isSupported, startRecording, stopRecording };
}
