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

export const FILM_BORDER_COLOR = "#f1efe8";
export const STRIP_WIDTH = 640;
export const GRID_COLS = 2;
export const GRID_ROWS = 2;
export const CELL_ASPECT_RATIO = 3 / 4; // width / height, 세로로 촬영되는 실제 사진 비율과 동일
export const STRIP_PADDING = 24;
export const PHOTO_GAP = 14;
export const SPROCKET_WIDTH = 28;
