/**
 * 라이브러리 없이 캔버스 픽셀 연산만으로 하는 가벼운 자동 보정.
 * 얼굴 인식 없이 사진 전체에 적용되는 간단한 버전 —
 * 화이트밸런스 + 자동 밝기/대비 + 은은한 소프트 글로우.
 */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * 그레이월드 화이트밸런스 + 자동 밝기/대비 스트레치.
 * 캔버스에 이미 그려진 픽셀을 직접 읽고 고쳐서 다시 그린다.
 */
export function autoCorrectFrame(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const pixelCount = width * height;

  // 1패스: 색 평균(화이트밸런스용)과 밝기 분포(대비 스트레치용) 계산
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let minLum = 255;
  let maxLum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    rSum += r;
    gSum += g;
    bSum += b;

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  const rAvg = rSum / pixelCount || 1;
  const gAvg = gSum / pixelCount || 1;
  const bAvg = bSum / pixelCount || 1;
  const grayAvg = (rAvg + gAvg + bAvg) / 3;

  // 색 채널별 보정 게인 (너무 과하게 틀어지지 않도록 0.75~1.25로 제한)
  const rGain = clamp(grayAvg / rAvg, 0.75, 1.25);
  const gGain = clamp(grayAvg / gAvg, 0.75, 1.25);
  const bGain = clamp(grayAvg / bAvg, 0.75, 1.25);

  // 살짝 따뜻한 톤으로 (필름 감성에 어울리게)
  const warmR = 1.03;
  const warmB = 0.98;

  // 밝기 분포가 좁으면(흐릿/저대비) 넓혀주는 정도 계산, 과보정 방지로 상한선을 둠
  const range = Math.max(1, maxLum - minLum);
  const contrastBoost = clamp(235 / range, 1.0, 1.2);

  // 2패스: 실제 보정 적용
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * rGain * warmR;
    let g = data[i + 1] * gGain;
    let b = data[i + 2] * bGain * warmB;

    r = (r - minLum) * contrastBoost + minLum * 1.05;
    g = (g - minLum) * contrastBoost + minLum * 1.05;
    b = (b - minLum) * contrastBoost + minLum * 1.05;

    data[i] = clamp(r, 0, 255);
    data[i + 1] = clamp(g, 0, 255);
    data[i + 2] = clamp(b, 0, 255);
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

  blurCtx.filter = "blur(3px)";
  blurCtx.drawImage(canvas, 0, 0);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.globalCompositeOperation = "soft-light";
  ctx.drawImage(blurCanvas, 0, 0);
  ctx.restore();
}

/** 두 보정을 한 번에 적용하는 헬퍼 */
export function applyAutoBeautify(canvas: HTMLCanvasElement): void {
  autoCorrectFrame(canvas);
  applySoftGlow(canvas);
}
