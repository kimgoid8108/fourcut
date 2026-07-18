import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 관리자(회장님) 폰의 푸시 구독 정보를 고정된 경로에 저장한다.
// 새로 구독할 때마다 이 파일을 덮어써서, 항상 최신 기기 하나만 등록되게 한다.
export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json();

    if (!subscription?.endpoint) {
      return NextResponse.json(
        { error: "잘못된 구독 정보입니다." },
        { status: 400 },
      );
    }

    await put("admin/push-subscription.json", JSON.stringify(subscription), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("구독 저장 실패:", err);
    return NextResponse.json({ error: "구독 저장에 실패했습니다." }, { status: 500 });
  }
}