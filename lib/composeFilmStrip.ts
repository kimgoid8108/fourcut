import {
  FILM_BORDER_COLOR,
  PHOTO_GAP,
  PHOTO_HEIGHT,
  SPROCKET_WIDTH,
  STRIP_PADDING,
  STRIP_WIDTH,
  STRIP_PHOTO_COUNT,
} from "@/lib/constants";
import { formatCaptureTimestamp, loadImage } from "@/lib/captureFrame";

function drawSprocketHoles(
  ctx: CanvasRenderingContext2D,
  x: number,
  yStart: number,
  yEnd: number,
  side: "left" | "right",
): void {
  const holeWidth = 10;
  const holeHeight = 16;
  const spacing = 28;
  const inset = side === "left" ? 9 : SPROCKET_WIDTH - 9 - holeWidth;

  ctx.fillStyle = "#0a0a0a";

  for (let y = yStart + 16; y < yEnd - 16; y += spacing) {
    ctx.beginPath();
    ctx.roundRect(x + inset, y, holeWidth, holeHeight, 3);
    ctx.fill();
  }
}

function drawTitle(ctx: CanvasRenderingContext2D, centerX: number, y: number): void {
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "600 28px Pretendard, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("인생네컷", centerX, y);
}

function drawTimestamp(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  capturedAt: Date,
): void {
  ctx.fillStyle = "#666660";
  ctx.font = "400 11px Pretendard, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatCaptureTimestamp(capturedAt), centerX, y);
}

export async function composeFilmStrip(
  frames: string[],
  capturedAt: Date,
): Promise<string> {
  if (frames.length !== STRIP_PHOTO_COUNT) {
    throw new Error(`Expected ${STRIP_PHOTO_COUNT} frames, got ${frames.length}`);
  }

  const images = await Promise.all(frames.map(loadImage));

  const photoAreaWidth = STRIP_WIDTH - SPROCKET_WIDTH * 2 - STRIP_PADDING * 2;
  const titleHeight = 52;
  const timestampHeight = 36;
  const contentHeight =
    titleHeight +
    STRIP_PHOTO_COUNT * PHOTO_HEIGHT +
    (STRIP_PHOTO_COUNT - 1) * PHOTO_GAP +
    timestampHeight +
    STRIP_PADDING * 2;

  const canvas = document.createElement("canvas");
  canvas.width = STRIP_WIDTH;
  canvas.height = contentHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.fillStyle = FILM_BORDER_COLOR;
  ctx.fillRect(0, 0, STRIP_WIDTH, contentHeight);

  drawSprocketHoles(ctx, 0, 0, contentHeight, "left");
  drawSprocketHoles(ctx, STRIP_WIDTH - SPROCKET_WIDTH, 0, contentHeight, "right");

  const contentX = SPROCKET_WIDTH + STRIP_PADDING;
  let cursorY = STRIP_PADDING;

  drawTitle(ctx, STRIP_WIDTH / 2, cursorY + titleHeight / 2);
  cursorY += titleHeight;

  for (let i = 0; i < STRIP_PHOTO_COUNT; i++) {
    const img = images[i];
    const scale = Math.max(photoAreaWidth / img.width, PHOTO_HEIGHT / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const offsetX = contentX + (photoAreaWidth - drawW) / 2;
    const offsetY = cursorY + (PHOTO_HEIGHT - drawH) / 2;

    ctx.fillStyle = "#000";
    ctx.fillRect(contentX, cursorY, photoAreaWidth, PHOTO_HEIGHT);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    if (i < STRIP_PHOTO_COUNT - 1) {
      cursorY += PHOTO_HEIGHT + PHOTO_GAP;
    } else {
      cursorY += PHOTO_HEIGHT;
    }
  }

  drawTimestamp(ctx, STRIP_WIDTH / 2, cursorY + timestampHeight / 2, capturedAt);

  return canvas.toDataURL("image/png");
}
