import { get, put } from "@vercel/blob";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface ShareManifest {
  imageUrl: string;
  videoUrl: string;
  fullVideoUrl: string;
}

function isBlobUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

function manifestPath(id: string): string {
  return `strips/share-${id}.json`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ShareManifest>;

    if (
      !isBlobUrl(body.imageUrl) ||
      !isBlobUrl(body.videoUrl) ||
      !isBlobUrl(body.fullVideoUrl)
    ) {
      return NextResponse.json(
        { error: "올바른 공유 파일 주소가 필요합니다." },
        { status: 400 },
      );
    }

    const id = randomBytes(8).toString("base64url");
    const manifest: ShareManifest = {
      imageUrl: body.imageUrl,
      videoUrl: body.videoUrl,
      fullVideoUrl: body.fullVideoUrl,
    };

    await put(manifestPath(id), JSON.stringify(manifest), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error("share manifest creation failed:", error);
    return NextResponse.json(
      { error: "공유 링크 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return NextResponse.json({ error: "잘못된 공유 링크입니다." }, { status: 400 });
  }

  try {
    const result = await get(manifestPath(id), { access: "public" });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json(
        { error: "만료되었거나 존재하지 않는 공유 링크입니다." },
        { status: 404 },
      );
    }

    const manifest = (await new Response(result.stream).json()) as ShareManifest;
    return NextResponse.json(manifest, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    console.error("share manifest lookup failed:", error);
    return NextResponse.json(
      { error: "공유 링크를 불러오지 못했습니다." },
      { status: 404 },
    );
  }
}
