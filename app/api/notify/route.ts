import { list } from "@vercel/blob";
import { NextResponse } from "next/server";
import webpush from "web-push";

export const runtime = "nodejs";

const vapidConfigured =
  !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
}

// 손님이 "관리자(회장님) 부르기" 버튼을 누르면 호출되는 라우트.
// 등록된 관리자 기기의 구독 정보를 찾아서 푸시 알림을 보낸다.
export async function POST() {
  if (!vapidConfigured) {
    return NextResponse.json(
      { error: "푸시 알림이 설정되지 않았습니다 (VAPID 키 누락)." },
      { status: 500 },
    );
  }

  try {
    const { blobs } = await list({
      prefix: "admin/push-subscription.json",
      limit: 1,
    });

    if (blobs.length === 0) {
      return NextResponse.json(
        { error: "등록된 관리자 알림 구독이 없습니다. 관리자 페이지에서 먼저 구독해주세요." },
        { status: 404 },
      );
    }

    const res = await fetch(blobs[0].url);
    if (!res.ok) {
      return NextResponse.json(
        { error: "구독 정보를 불러오지 못했습니다." },
        { status: 500 },
      );
    }
    const subscription = await res.json();

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "🙋 관리자 호출",
        body: "손님이 인화(프린트) 도움을 요청했어요!",
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("알림 전송 실패:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알림 전송에 실패했습니다." },
      { status: 500 },
    );
  }
}