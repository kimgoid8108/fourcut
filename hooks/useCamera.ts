"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "ready" | "error";

interface UseCameraOptions {
  facingMode?: "user" | "environment";
}

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  status: CameraStatus;
  errorMessage: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraResult {
  const { facingMode = "user" } = options;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("이 브라우저는 카메라를 지원하지 않습니다.");
      return;
    }

    setStatus("requesting");
    setErrorMessage(null);

    try {
      setStream((current) => {
        current?.getTracks().forEach((track) => track.stop());
        return null;
      });

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 960 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setStatus("ready");
    } catch (err) {
      setStatus("error");

      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setErrorMessage(
            "카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 접근을 허용해 주세요.",
          );
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setErrorMessage("사용 가능한 카메라를 찾을 수 없습니다.");
        } else if (err.name === "NotReadableError") {
          setErrorMessage("카메라가 다른 앱에서 사용 중입니다. 앱을 종료한 뒤 다시 시도해 주세요.");
        } else {
          setErrorMessage(`카메라를 시작할 수 없습니다. (${err.name})`);
        }
      } else {
        setErrorMessage("카메라를 시작하는 중 알 수 없는 오류가 발생했습니다.");
      }
    }
  }, [facingMode]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      setStream((current) => {
        current?.getTracks().forEach((track) => track.stop());
        return null;
      });
    };
  }, []);

  return {
    videoRef,
    stream,
    status,
    errorMessage,
    startCamera,
    stopCamera,
  };
}