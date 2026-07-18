const FILTER = "none";

export function applyFilmFilter(ctx: CanvasRenderingContext2D): void {
  ctx.filter = FILTER;
}

export function resetCanvasFilter(ctx: CanvasRenderingContext2D): void {
  ctx.filter = "none";
}

export function captureFrameFromVideo(
  video: HTMLVideoElement,
  targetWidth = 640,
  targetHeight = 480,
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

  applyFilmFilter(ctx);
  ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
  resetCanvasFilter(ctx);

  return canvas.toDataURL("image/png");
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