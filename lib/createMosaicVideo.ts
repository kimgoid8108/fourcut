"use client";

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
} from "@/lib/constants";
import { formatCaptureDate } from "@/lib/captureFrame";

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

function loadVideoEl(blob: Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(blob);
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("영상을 불러오지 못했습니다."));
  });
}

interface MosaicOptions {
  fps?: number;
  /** 인쇄용 실제 사이즈(1200px) 대비 영상 해상도 비율. 성능을 위해 절반 정도로. */
  scale?: number;
}

/**
 * 선택된 4컷의 짧은 영상 클립 4개를, composeFilmStrip.ts와 동일한
 * 필름 프레임(흰 여백 + 브랜드 문구 + 날짜 스탬프) 안에서
 * 사진과 같은 2x2 배치로 동시에 재생되는 모자이크 영상으로 합성한다.
 */
export async function createMosaicVideo(
  clips: Blob[],
  capturedAt: Date,
  options: MosaicOptions = {},
): Promise<Blob> {
  if (clips.length !== 4) {
    throw new Error("정확히 4개의 영상 클립이 필요합니다.");
  }

  const { fps = 24, scale = 0.5 } = options;

  const mimeType = pickSupportedMimeType();
  if (!mimeType) {
    throw new Error("이 브라우저는 영상 녹화를 지원하지 않습니다.");
  }

  // 캔버스에 텍스트를 그리기 전, 웹폰트(세종글꽃체)가 로드됐는지 기다린다
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.load("400 32px SejongGeulggot");
      await document.fonts.ready;
    } catch {
      // 실패해도 대체 폰트로 계속 진행
    }
  }

  const videos = await Promise.all(clips.map(loadVideoEl));

  // composeFilmStrip.ts와 동일한 비율의 프레임 레이아웃을, 영상용으로 축소해서 재사용
  const width = Math.round(STRIP_WIDTH * scale);
  const padding = Math.round(STRIP_PADDING * scale);
  const gap = Math.round(PHOTO_GAP * scale);
  const bottomAreaHeight = Math.round(BOTTOM_AREA_HEIGHT * scale);

  const gridAreaWidth = width - padding * 2;
  const cellWidth = (gridAreaWidth - gap * (GRID_COLS - 1)) / GRID_COLS;
  const cellHeight = cellWidth / CELL_ASPECT_RATIO;
  const gridHeight = cellHeight * GRID_ROWS + gap * (GRID_ROWS - 1);
  const height = Math.round(padding + gridHeight + bottomAreaHeight + padding);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  // 사진 그리드와 동일한 순서: 좌상단 → 우상단 → 좌하단 → 우하단
  const positions = [0, 1, 2, 3].map((i) => {
    const row = Math.floor(i / GRID_COLS);
    const col = i % GRID_COLS;
    return {
      x: padding + col * (cellWidth + gap),
      y: padding + row * (cellHeight + gap),
    };
  });

  const dateLabel = formatCaptureDate(capturedAt);
  const bottomAreaStartY = padding + gridHeight;
  const brandY = bottomAreaStartY + bottomAreaHeight * 0.42;
  const timestampY = bottomAreaStartY + bottomAreaHeight * 0.72;

  const drawFrame = () => {
    // 필름 배경(여백)을 매 프레임 다시 채워서, 영상 위에 프레임이 항상 유지되게 한다
    ctx.fillStyle = FILM_BORDER_COLOR;
    ctx.fillRect(0, 0, width, height);

    videos.forEach((video, i) => {
      const { x, y } = positions[i];

      ctx.fillStyle = "#000";
      ctx.fillRect(x, y, cellWidth, cellHeight);

      // cover-fit: 각 칸을 꽉 채우도록 확대해서 중앙 기준으로 그림
      const vScale = Math.max(
        cellWidth / video.videoWidth,
        cellHeight / video.videoHeight,
      );
      const drawW = video.videoWidth * vScale;
      const drawH = video.videoHeight * vScale;
      const offsetX = x + (cellWidth - drawW) / 2;
      const offsetY = y + (cellHeight - drawH) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cellWidth, cellHeight);
      ctx.clip();
      ctx.drawImage(video, offsetX, offsetY, drawW, drawH);
      ctx.restore();
    });

    // 사진과 동일한 브랜드 문구 + 날짜 스탬프
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `400 ${Math.round(64 * scale)}px SejongGeulggot, Pretendard, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(BRAND_NAME, width / 2, brandY);

    ctx.fillStyle = "#666660";
    ctx.font = `400 ${Math.round(24 * scale)}px SejongGeulggot, Pretendard, sans-serif`;
    ctx.fillText(dateLabel, width / 2, timestampY);
  };

  type CaptureCanvas = HTMLCanvasElement & {
    captureStream: (frameRate?: number) => MediaStream;
  };
  const stream = (canvas as CaptureCanvas).captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 3_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  let rafId = 0;
  let stopped = false;

  const loop = () => {
    if (stopped) return;
    drawFrame();
    rafId = requestAnimationFrame(loop);
  };

  recorder.start();
  await Promise.all(videos.map((v) => v.play().catch(() => undefined)));
  loop();

  await new Promise<void>((resolve) => {
    let endedCount = 0;
    videos.forEach((video) => {
      video.onended = () => {
        endedCount += 1;
        if (endedCount === videos.length) resolve();
      };
    });
  });

  stopped = true;
  cancelAnimationFrame(rafId);
  recorder.stop();

  const result = await recordingDone;

  videos.forEach((video) => URL.revokeObjectURL(video.src));

  return result;
}