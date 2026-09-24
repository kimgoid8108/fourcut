import { applyAutoBeautify } from "@/lib/autoCorrect";
import type { PhotoFilterId } from "@/lib/photoFilters";

const OUTPUT_ASPECT_RATIO = 3 / 4;
const MAX_CAPTURE_WIDTH = 1440;
const MAX_CAPTURE_HEIGHT = 1920;
const JPEG_QUALITY = 0.92;

export function captureFrameFromVideo(
  video: HTMLVideoElement,
  filterId: PhotoFilterId = "natural",
): string {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("Camera frame is not ready");
  }

  // 실제 카메라 프레임에서 가장 큰 3:4 세로 영역을 먼저 자른다. 이렇게 하면
  // 낮은 해상도로 줄였다가 다시 키우는 과정 없이 인쇄에 필요한 픽셀을 보존한다.
  const sourceAspect = sourceWidth / sourceHeight;
  let cropWidth: number;
  let cropHeight: number;

  if (sourceAspect > OUTPUT_ASPECT_RATIO) {
    cropHeight = sourceHeight;
    cropWidth = cropHeight * OUTPUT_ASPECT_RATIO;
  } else {
    cropWidth = sourceWidth;
    cropHeight = cropWidth / OUTPUT_ASPECT_RATIO;
  }

  // 원본보다 키우지 않으면서 M1 iPad에서 8장을 처리하기 적당한 크기로 제한한다.
  const outputScale = Math.min(
    1,
    MAX_CAPTURE_WIDTH / cropWidth,
    MAX_CAPTURE_HEIGHT / cropHeight,
  );
  const targetWidth = Math.max(1, Math.round(cropWidth * outputScale));
  const targetHeight = Math.max(1, Math.round(cropHeight * outputScale));
  const sourceX = (sourceWidth - cropWidth) / 2;
  const sourceY = (sourceHeight - cropHeight) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    video,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  // 화이트밸런스 + 자동 밝기/대비 + 은은한 소프트 글로우
  applyAutoBeautify(canvas, filterId);

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/**
 * 움직임 GIF용 저해상도 프레임 캡처. 10초 카운트다운 동안 매초 한 장씩
 * 찍어서 쌓아두는 용도라, 용량을 작게 유지하려고 JPEG + 낮은 해상도를 쓴다.
 */
export function captureBurstFrame(
  video: HTMLVideoElement,
  targetWidth = 240,
  targetHeight = 320,
): string {
  const canvas = document.createElement("canvas");
  const aspect = video.videoWidth / video.videoHeight;
  let drawWidth = targetWidth;
  let drawHeight = targetHeight;

  if (aspect > targetWidth / targetHeight) {
    drawHeight = targetHeight;
    drawWidth = Math.round(targetHeight * aspect);
  } else {
    drawWidth = targetWidth;
    drawHeight = Math.round(targetWidth / aspect);
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  const offsetX = (targetWidth - drawWidth) / 2;
  const offsetY = (targetHeight - drawHeight) / 2;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

  return canvas.toDataURL("image/jpeg", 0.7);
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export function formatCaptureTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}  ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// 필름 이미지에 찍히는 날짜 스탬프용 — 시간 없이 날짜만
export function formatCaptureDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
