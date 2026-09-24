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

  // 사진 너비의 10% 크기로, 우측 하단 모서리에 배치한다. QR 이미지 자체에
  // 표준 여백이 포함되어 있으므로 바깥쪽 흰 패딩은 추가하지 않는다.
  const qrSize = Math.round(base.width * 0.1);
  const margin = Math.round(base.width * 0.03);
  const x = base.width - qrSize - margin;
  const y = base.height - qrSize - margin;

  ctx.drawImage(qr, x, y, qrSize, qrSize);

  return canvas.toDataURL("image/png");
}
