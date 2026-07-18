import {
  CELL_ASPECT_RATIO,
  FILM_BORDER_COLOR,
  GRID_COLS,
  GRID_ROWS,
  PHOTO_GAP,
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

function drawTitle(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
): void {
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
    throw new Error(
      `Expected ${STRIP_PHOTO_COUNT} frames, got ${frames.length}`,
    );
  }

  const images = await Promise.all(frames.map(loadImage));

  const gridAreaWidth = STRIP_WIDTH - SPROCKET_WIDTH * 2 - STRIP_PADDING * 2;
  const cellWidth = (gridAreaWidth - PHOTO_GAP * (GRID_COLS - 1)) / GRID_COLS;
  const cellHeight = cellWidth / CELL_ASPECT_RATIO;
  const gridHeight = cellHeight * GRID_ROWS + PHOTO_GAP * (GRID_ROWS - 1);

  const titleHeight = 52;
  const timestampHeight = 36;
  const contentHeight =
    titleHeight + gridHeight + timestampHeight + STRIP_PADDING * 2;

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
  drawSprocketHoles(
    ctx,
    STRIP_WIDTH - SPROCKET_WIDTH,
    0,
    contentHeight,
    "right",
  );

  const contentX = SPROCKET_WIDTH + STRIP_PADDING;
  let cursorY = STRIP_PADDING;

  drawTitle(ctx, STRIP_WIDTH / 2, cursorY + titleHeight / 2);
  cursorY += titleHeight;

  const gridStartY = cursorY;

  for (let i = 0; i < STRIP_PHOTO_COUNT; i++) {
    const img = images[i];
    const row = Math.floor(i / GRID_COLS);
    const col = i % GRID_COLS;

    const cellX = contentX + col * (cellWidth + PHOTO_GAP);
    const cellY = gridStartY + row * (cellHeight + PHOTO_GAP);

    // cover-fit: 셀을 꽉 채우도록 확대한 뒤 중앙 기준으로 잘라서 그림
    const scale = Math.max(cellWidth / img.width, cellHeight / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const offsetX = cellX + (cellWidth - drawW) / 2;
    const offsetY = cellY + (cellHeight - drawH) / 2;

    ctx.fillStyle = "#000";
    ctx.fillRect(cellX, cellY, cellWidth, cellHeight);

    ctx.save();
    ctx.beginPath();
    ctx.rect(cellX, cellY, cellWidth, cellHeight);
    ctx.clip();
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    ctx.restore();
  }

  cursorY = gridStartY + gridHeight;

  drawTimestamp(
    ctx,
    STRIP_WIDTH / 2,
    cursorY + timestampHeight / 2,
    capturedAt,
  );

  return canvas.toDataURL("image/png");
}
