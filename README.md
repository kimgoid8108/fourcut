# 인생네컷 (Life in Four Cuts)

아이패드 전면 카메라로 촬영하는 흑백 필름 감성 4컷 포토부스 웹앱입니다.

## 기술 스택

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Pretendard (CDN)

## 실행 방법

```bash
npm install
npm run dev
```

## 촬영 플로우

1. **촬영 시작** 클릭
2. **8컷 순차 촬영** — 컷마다 10초 준비 카운트다운 (10→1) 후 플래시·캡처
3. **선택 화면** — 8장 중 4장 탭하여 선택
4. **다음** → 선택된 4장을 촬영 순서대로 필름 스트립 합성
5. PNG 다운로드 / 다시 촬영

## 프로젝트 구조

```
app/page.tsx
components/PhotoBoothApp   — idle → capturing → selecting → done
components/CameraBooth
components/CountdownOverlay — 사전 카운트다운 + 10초 타이머 + 플래시
components/ShotSelector     — 8장 썸네일, 4장 선택
components/FilmStrip
components/DownloadButton
hooks/useCamera.ts
hooks/useFilmStrip.ts
lib/captureFrame.ts
lib/composeFilmStrip.ts
```
