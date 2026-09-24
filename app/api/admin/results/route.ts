import { list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESULT_IMAGE_PATTERN = /^strips\/[0-9a-f-]{36}\.png$/i;

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const result = await list({ prefix: "strips/", limit: 200 });
    const photos = result.blobs
      .filter((blob) => RESULT_IMAGE_PATTERN.test(blob.pathname))
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(0, 50)
      .map((blob) => ({
        id: blob.pathname,
        imageUrl: blob.url,
        downloadUrl: blob.downloadUrl,
        uploadedAt: blob.uploadedAt.toISOString(),
      }));

    return NextResponse.json(
      { photos },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("admin results lookup failed:", error);
    return NextResponse.json(
      { error: "촬영 사진을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
