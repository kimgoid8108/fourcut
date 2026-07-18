"use client";

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
  cellWidth?: number;
  cellHeight?: number;
  gap?: number;
  fps?: number;
}

/**
 * 선택된 4컷의 짧은 영상 클립 4개를, 사진(2x2 그리드)과 동일한 배치로
 * 동시에 재생되는 모자이크 영상 하나로 합성한다.
 * 4개 클립을 실제로 재생시키며 캔버스를 녹화하는 방식이라,
 * 클립 길이(약 10초)만큼 실제 처리 시간이 걸린다.
 */
export async function createMosaicVideo(
  clips: Blob[],
  options: MosaicOptions = {},
): Promise<Blob> {
  if (clips.length !== 4) {
    throw new Error("정확히 4개의 영상 클립이 필요합니다.");
  }

  const { cellWidth = 320, cellHeight = 427, gap = 8, fps = 24 } = options;

  const mimeType = pickSupportedMimeType();
  if (!mimeType) {
    throw new Error("이 브라우저는 영상 녹화를 지원하지 않습니다.");
  }

  const videos = await Promise.all(clips.map(loadVideoEl));

  const canvas = document.createElement("canvas");
  canvas.width = cellWidth * 2 + gap;
  canvas.height = cellHeight * 2 + gap;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  // 사진 그리드와 동일한 순서: 좌상단 → 우상단 → 좌하단 → 우하단
  const positions = [
    { x: 0, y: 0 },
    { x: cellWidth + gap, y: 0 },
    { x: 0, y: cellHeight + gap },
    { x: cellWidth + gap, y: cellHeight + gap },
  ];

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

  const draw = () => {
    if (stopped) return;

    videos.forEach((video, i) => {
      const { x, y } = positions[i];

      ctx.fillStyle = "#000";
      ctx.fillRect(x, y, cellWidth, cellHeight);

      // cover-fit: 각 칸을 꽉 채우도록 확대해서 중앙 기준으로 그림
      const scale = Math.max(
        cellWidth / video.videoWidth,
        cellHeight / video.videoHeight,
      );
      const drawW = video.videoWidth * scale;
      const drawH = video.videoHeight * scale;
      const offsetX = x + (cellWidth - drawW) / 2;
      const offsetY = y + (cellHeight - drawH) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cellWidth, cellHeight);
      ctx.clip();
      ctx.drawImage(video, offsetX, offsetY, drawW, drawH);
      ctx.restore();
    });

    rafId = requestAnimationFrame(draw);
  };

  recorder.start();
  await Promise.all(videos.map((v) => v.play().catch(() => undefined)));
  draw();

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
