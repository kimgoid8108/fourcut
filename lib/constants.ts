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
export const STRIP_WIDTH = 480;
export const PHOTO_HEIGHT = 320;
export const STRIP_PADDING = 24;
export const PHOTO_GAP = 12;
export const SPROCKET_WIDTH = 28;
