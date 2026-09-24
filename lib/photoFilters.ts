export type PhotoFilterId =
  | "natural"
  | "bright"
  | "warm"
  | "cool"
  | "mono"
  | "film";

export interface PhotoFilterPreset {
  id: PhotoFilterId;
  label: string;
  description: string;
  previewFilter: string;
  exposure: number;
  contrast: number;
  saturation: number;
  redGain: number;
  greenGain: number;
  blueGain: number;
  shadowLift: number;
}

export const PHOTO_FILTERS: readonly PhotoFilterPreset[] = [
  {
    id: "natural",
    label: "자연스럽게",
    description: "기본 자동 보정",
    previewFilter: "brightness(1.03) contrast(1.04) saturate(1.03)",
    exposure: 1,
    contrast: 1,
    saturation: 1,
    redGain: 1,
    greenGain: 1,
    blueGain: 1,
    shadowLift: 0,
  },
  {
    id: "bright",
    label: "화사하게",
    description: "밝고 부드러운 피부톤",
    previewFilter: "brightness(1.1) contrast(0.98) saturate(1.06)",
    exposure: 1.07,
    contrast: 0.98,
    saturation: 1.05,
    redGain: 1.01,
    greenGain: 1,
    blueGain: 0.99,
    shadowLift: 3,
  },
  {
    id: "warm",
    label: "따뜻하게",
    description: "포근한 웜 톤",
    previewFilter: "brightness(1.04) contrast(1.03) saturate(1.08) sepia(0.12)",
    exposure: 1.02,
    contrast: 1.03,
    saturation: 1.07,
    redGain: 1.045,
    greenGain: 1.01,
    blueGain: 0.95,
    shadowLift: 1,
  },
  {
    id: "cool",
    label: "맑게",
    description: "깨끗한 쿨 톤",
    previewFilter: "brightness(1.04) contrast(1.04) saturate(1.03) hue-rotate(3deg)",
    exposure: 1.01,
    contrast: 1.035,
    saturation: 1.025,
    redGain: 0.975,
    greenGain: 1.01,
    blueGain: 1.055,
    shadowLift: 1,
  },
  {
    id: "mono",
    label: "흑백",
    description: "선명한 흑백",
    previewFilter: "grayscale(1) brightness(1.03) contrast(1.1)",
    exposure: 1.01,
    contrast: 1.1,
    saturation: 0,
    redGain: 1,
    greenGain: 1,
    blueGain: 1,
    shadowLift: 0,
  },
  {
    id: "film",
    label: "필름",
    description: "차분한 빈티지 톤",
    previewFilter: "brightness(1.03) contrast(1.08) saturate(0.88) sepia(0.09)",
    exposure: 1.01,
    contrast: 1.075,
    saturation: 0.88,
    redGain: 1.025,
    greenGain: 1,
    blueGain: 0.97,
    shadowLift: 5,
  },
] as const;

export function getPhotoFilter(id: PhotoFilterId): PhotoFilterPreset {
  return PHOTO_FILTERS.find((filter) => filter.id === id) ?? PHOTO_FILTERS[0];
}
