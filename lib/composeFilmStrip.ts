import {
  BOTTOM_AREA_HEIGHT,
  BRAND_NAME,
  CELL_ASPECT_RATIO,
  FILM_BORDER_COLOR,
  GRID_COLS,
  GRID_ROWS,
  PHOTO_GAP,
  STRIP_PADDING,
  STRIP_WIDTH,
  STRIP_PHOTO_COUNT,
} from "@/lib/constants";
import { formatCaptureDate, loadImage } from "@/lib/captureFrame";
import { applyFaceBeautify } from "@/lib/faceBeautify";

// 하단 브랜드 문구("양문네컷") — 크게, 세종글꽃체로
function drawBrand(ctx: CanvasRenderingContext2D, centerX: number, y: number): void {
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "400 64px SejongGeulggot, Pretendard, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(BRAND_NAME, centerX, y);
}

// 브랜드 문구 아래, 작게 들어가는 촬영 날짜/시간 스탬프
function drawTimestamp(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  capturedAt: Date,
): void {
  ctx.fillStyle = "#666660";
  ctx.font = "400 24px SejongGeulggot, Pretendard, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatCaptureDate(capturedAt), centerX, y);
}

export async function composeFilmStrip(
  frames: string[],
  capturedAt: Date,
): Promise<string> {
  if (frames.length !== STRIP_PHOTO_COUNT) {
    throw new Error(`Expected ${STRIP_PHOTO_COUNT} frames, got ${frames.length}`);
  }

  // 캔버스에 텍스트를 그리기 전, 웹폰트(세종글꽃체)가 실제로
  // 로드 완료됐는지 기다린다. 이게 없으면 폰트가 늦게 로드될 경우
  // 캔버스는 대체 폰트로 그려버린다.
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.load("400 64px SejongGeulggot");
      await document.fonts.ready;
    } catch {
      // 폰트 로드 실패 시에도 나머지 렌더링은 계속 진행 (fallback 폰트로 표시됨)
    }
  }

  const images = await Promise.all(frames.map(loadImage));
  const preparedImages: HTMLCanvasElement[] = [];

  // 실시간 카메라 대신 최종 선택된 4장에만 얼굴 보정을 적용한다.
  // 원본 프레임은 유지되며 얼굴을 못 찾거나 모델 로딩이 실패해도
  // 기존 기본 보정본으로 필름 제작을 계속한다.
  for (const image of images) {
    const prepared = document.createElement("canvas");
    prepared.width = image.naturalWidth;
    prepared.height = image.naturalHeight;
    const preparedContext = prepared.getContext("2d");
    if (!preparedContext) throw new Error("Canvas context unavailable");
    preparedContext.drawImage(image, 0, 0);
    await applyFaceBeautify(prepared);
    preparedImages.push(prepared);
  }

  // 좌우 필름 스프로킷(구멍) 장식 없이, 순수한 여백만 사용
  const gridAreaWidth = STRIP_WIDTH - STRIP_PADDING * 2;
  const cellWidth = (gridAreaWidth - PHOTO_GAP * (GRID_COLS - 1)) / GRID_COLS;
  const cellHeight = cellWidth / CELL_ASPECT_RATIO;
  const gridHeight = cellHeight * GRID_ROWS + PHOTO_GAP * (GRID_ROWS - 1);

  // 상단 타이틀 없이, 사진이 캔버스 맨 위쪽(패딩 바로 다음)부터 시작한다.
  // 브랜드 문구·날짜 스탬프는 사진 아래(하단 전용 영역)에 배치.
  const contentHeight = STRIP_PADDING + gridHeight + BOTTOM_AREA_HEIGHT + STRIP_PADDING;

  const canvas = document.createElement("canvas");
  canvas.width = STRIP_WIDTH;
  canvas.height = contentHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.fillStyle = FILM_BORDER_COLOR;
  ctx.fillRect(0, 0, STRIP_WIDTH, contentHeight);

  const contentX = STRIP_PADDING;
  const gridStartY = STRIP_PADDING;

  for (let i = 0; i < STRIP_PHOTO_COUNT; i++) {
    const img = preparedImages[i];
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

  const bottomAreaStartY = gridStartY + gridHeight;
  const brandY = bottomAreaStartY + BOTTOM_AREA_HEIGHT * 0.42;
  const timestampY = bottomAreaStartY + BOTTOM_AREA_HEIGHT * 0.72;

  drawBrand(ctx, STRIP_WIDTH / 2, brandY);
  drawTimestamp(ctx, STRIP_WIDTH / 2, timestampY, capturedAt);

  return canvas.toDataURL("image/png");
}
