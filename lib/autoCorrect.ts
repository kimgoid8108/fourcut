/**
 * 라이브러리 없이 캔버스 픽셀 연산만으로 하는 가벼운 자동 보정.
 * 얼굴 인식 없이 사진 전체에 적용되는 간단한 버전 —
 * 화이트밸런스 + 자동 밝기/대비 + 은은한 소프트 글로우.
 */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * 완만한 그레이월드 화이트밸런스 + 자동 밝기/대비 보정.
 * 캔버스에 이미 그려진 픽셀을 직접 읽고 고쳐서 다시 그린다.
 */
export function autoCorrectFrame(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // 1패스: 일부 픽셀을 샘플링해 색 평균과 밝기 히스토그램을 계산한다.
  // 모든 픽셀을 통계에 쓰지 않아도 결과 차이는 거의 없고 촬영 순간의 부담은 준다.
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let lumSum = 0;
  let sampleCount = 0;
  const histogram = new Uint32Array(256);

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    rSum += r;
    gSum += g;
    bSum += b;

    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    lumSum += lum;
    histogram[lum] += 1;
    sampleCount += 1;
  }

  const rAvg = rSum / sampleCount || 1;
  const gAvg = gSum / sampleCount || 1;
  const bAvg = bSum / sampleCount || 1;
  const grayAvg = (rAvg + gAvg + bAvg) / 3;
  const averageLum = lumSum / sampleCount || 128;

  const percentile = (ratio: number): number => {
    const target = sampleCount * ratio;
    let cumulative = 0;
    for (let value = 0; value < histogram.length; value += 1) {
      cumulative += histogram[value];
      if (cumulative >= target) return value;
    }
    return 255;
  };

  // 극단값 한두 개 대신 1%~99% 밝기 구간을 사용해 대비를 안정적으로 판단한다.
  const lowLum = percentile(0.01);
  const highLum = percentile(0.99);
  const tonalRange = Math.max(1, highLum - lowLum);

  // 화이트밸런스는 계산값의 35%만 반영해 피부색과 공간 고유의 색을 보존한다.
  const balanceStrength = 0.35;
  const channelGain = (average: number): number =>
    1 + (clamp(grayAvg / average, 0.8, 1.2) - 1) * balanceStrength;
  const rGain = channelGain(rAvg);
  const gGain = channelGain(gAvg);
  const bGain = channelGain(bAvg);

  // 살짝 따뜻한 톤으로 (필름 감성에 어울리게)
  const warmR = 1.03;
  const warmB = 0.98;

  const exposure = clamp(138 / averageLum, 0.94, 1.12);
  const contrastBoost = clamp(210 / tonalRange, 1, 1.12);
  const saturation = 1.035;
  const softenHighlight = (value: number): number =>
    value > 245 ? 245 + (value - 245) * 0.3 : value;

  // 2패스: 실제 보정 적용
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * rGain * warmR * exposure;
    let g = data[i + 1] * gGain * exposure;
    let b = data[i + 2] * bGain * warmB * exposure;

    r = (r - 128) * contrastBoost + 128;
    g = (g - 128) * contrastBoost + 128;
    b = (b - 128) * contrastBoost + 128;

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * saturation;
    g = lum + (g - lum) * saturation;
    b = lum + (b - lum) * saturation;

    // 밝은 피부와 조명의 디테일이 갑자기 하얗게 날아가지 않도록 완만히 압축한다.
    data[i] = clamp(softenHighlight(r), 0, 255);
    data[i + 1] = clamp(softenHighlight(g), 0, 255);
    data[i + 2] = clamp(softenHighlight(b), 0, 255);
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * 얼굴 인식 없이 사진 전체에 은은하게 퍼지는 소프트 글로우.
 * 살짝 흐릿하게 만든 사본을 약하게 겹쳐서, 뭉개짐 없이 부드러운 느낌만 더한다.
 */
export function applySoftGlow(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurCtx = blurCanvas.getContext("2d");
  if (!blurCtx) return;

  blurCtx.filter = "blur(2px)";
  blurCtx.drawImage(canvas, 0, 0);

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.globalCompositeOperation = "soft-light";
  ctx.drawImage(blurCanvas, 0, 0);
  ctx.restore();
}

/** 두 보정을 한 번에 적용하는 헬퍼 */
export function applyAutoBeautify(canvas: HTMLCanvasElement): void {
  autoCorrectFrame(canvas);
  applySoftGlow(canvas);
}
