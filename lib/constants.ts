export type BoothPhase = "idle" | "capturing" | "selecting" | "done";

export interface CaptureSession {
  frames: string[];
  capturedAt: Date;
}

export const TOTAL_CAPTURE_SHOTS = 8;
export const SELECT_COUNT = 4;
export const STRIP_PHOTO_COUNT = 4;

export const PER_SHOT_COUNTDOWN_SECONDS = 10;
export const FLASH_DURATION_MS = 350;

export const FILM_BORDER_COLOR = "white";
// 캐논 SELPHY CP1500 엽서 사이즈(4x6인치) 인쇄 해상도(300dpi)에 정확히 맞춘 캔버스 크기
// 4in * 300dpi = 1200px, 6in * 300dpi = 1800px
export const STRIP_WIDTH = 1200;
export const STRIP_HEIGHT = 1800;
export const GRID_COLS = 2;
export const GRID_ROWS = 2;
export const CELL_ASPECT_RATIO = 3 / 4; // width / height, 세로로 촬영되는 실제 사진 비율과 동일
export const STRIP_PADDING = 60;
export const PHOTO_GAP = 24;
// 하단 브랜드 문구("양문네컷") + 날짜 스탬프가 들어가는 영역 높이
export const BOTTOM_AREA_HEIGHT = 248;

export const BRAND_NAME = "양문네컷";