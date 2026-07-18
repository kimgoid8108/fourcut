import { del, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const RETENTION_DAYS = 3;

/**
 * Vercel Cron이 매일 호출하는 정리 작업.
 * strips/ 아래 업로드된 파일 중 3일이 지난 것들을 전부 삭제한다.
 * (실제 인생네컷/포토이즘 부스와 동일하게: 촬영일 포함 3일 후 서버에서 삭제)
 */
export async function GET(req: NextRequest) {
  // Vercel Cron이 호출할 때 자동으로 실어주는 값과 대조해서,
  // 아무나 이 엔드포인트를 호출해서 파일을 지우지 못하도록 막는다.
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;
  let cursor: string | undefined;

  try {
    do {
      const result = await list({ prefix: "strips/", cursor, limit: 200 });

      const expired = result.blobs.filter(
        (blob) => new Date(blob.uploadedAt).getTime() < cutoff,
      );

      if (expired.length > 0) {
        await del(expired.map((blob) => blob.url));
        deleted += expired.length;
      }

      cursor = result.cursor;
    } while (cursor);

    return NextResponse.json({ deleted });
  } catch (err) {
    console.error("cleanup failed:", err);
    return NextResponse.json({ error: "정리 작업 실패" }, { status: 500 });
  }
}
