import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid data URL");
  }
  return { buffer: Buffer.from(match[2], "base64"), contentType: match[1] };
}

// 완성된 필름 스트립 이미지만 업로드하는 라우트.
// (세션 영상은 용량이 커서 /api/share/video-token을 통해 브라우저에서
// Vercel Blob으로 직접 업로드한다 — 서버 함수 요청 용량 제한 우회)
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const image = form.get("image");

    if (typeof image !== "string") {
      return NextResponse.json(
        { error: "image(dataURL) 필드가 필요합니다." },
        { status: 400 },
      );
    }

    const id = randomUUID();
    const { buffer: imageBuffer, contentType: imageContentType } =
      dataUrlToBuffer(image);

    const imageBlob = await put(`strips/${id}.png`, imageBuffer, {
      access: "public",
      contentType: imageContentType || "image/png",
    });

    return NextResponse.json({ imageUrl: imageBlob.url });
  } catch (err) {
    console.error("share upload failed:", err);
    return NextResponse.json(
      { error: "업로드에 실패했습니다." },
      { status: 500 },
    );
  }
}
