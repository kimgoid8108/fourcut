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

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
