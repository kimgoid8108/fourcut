import { loadImage } from "@/lib/captureFrame";

/**
 * 완성된 필름 스트립 이미지 우측 하단에 QR코드를 겹쳐 그려서
 * 새 이미지를 만든다. 인쇄했을 때도 QR이 사진에 그대로 찍혀 나온다.
 */
export async function overlayQrOnStrip(
  baseDataUrl: string,
  qrDataUrl: string,
): Promise<string> {
  const [base, qr] = await Promise.all([
    loadImage(baseDataUrl),
    loadImage(qrDataUrl),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = base.width;
  canvas.height = base.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.drawImage(base, 0, 0);

  // 사진 너비의 약 16%를 QR 크기로, 우측 하단(대각선 아래) 모서리에 배치
  const qrSize = Math.round(base.width * 0.16);
  const margin = Math.round(base.width * 0.035);
  const x = base.width - qrSize - margin;
  const y = base.height - qrSize - margin;

  // 사진 위에서도 QR이 스캔 잘 되도록 흰 배경 패딩을 살짝 준다
  const pad = Math.round(qrSize * 0.1);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - pad, y - pad, qrSize + pad * 2, qrSize + pad * 2);
  ctx.drawImage(qr, x, y, qrSize, qrSize);

  return canvas.toDataURL("image/png");
}
