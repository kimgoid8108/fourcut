import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ["video/mp4", "video/webm"],
          addRandomSuffix: true,
          // 세션 영상은 사이즈 제한을 넉넉하게 (최대 200MB)
          maximumSizeInBytes: 200 * 1024 * 1024,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // 배포된(공개 URL이 있는) 환경에서만 Vercel이 이 콜백을 호출해줌.
        // 로컬 개발 중에는 호출되지 않을 수 있는데, 업로드 자체는 정상 동작한다.
        console.log("video upload completed:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "토큰 발급 실패" },
      { status: 400 },
    );
  }
}
