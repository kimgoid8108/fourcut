import type {
  FaceLandmarker,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const MODEL_URL = "/mediapipe/face_landmarker.task";
const MAX_DETECTION_WIDTH = 640;
const MAX_FACES = 8;

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
  379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234,
  127, 162, 21, 54, 103, 67, 109,
] as const;

let landmarkerPromise: Promise<FaceLandmarker | null> | null = null;

async function createLandmarker(): Promise<FaceLandmarker | null> {
  try {
    const { FaceLandmarker, FilesetResolver } = await import(
      "@mediapipe/tasks-vision"
    );
    const vision = await FilesetResolver.forVisionTasks("/mediapipe");
    const commonOptions = {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: "IMAGE" as const,
      numFaces: MAX_FACES,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };

    try {
      return await FaceLandmarker.createFromOptions(vision, {
        ...commonOptions,
        baseOptions: {
          ...commonOptions.baseOptions,
          delegate: "GPU",
        },
      });
    } catch {
      return await FaceLandmarker.createFromOptions(vision, commonOptions);
    }
  } catch (error) {
    console.warn("MediaPipe 얼굴 보정 모델을 불러오지 못했습니다.", error);
    return null;
  }
}

function getLandmarker(): Promise<FaceLandmarker | null> {
  landmarkerPromise ??= createLandmarker();
  return landmarkerPromise;
}

function point(
  landmarks: NormalizedLandmark[],
  index: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: landmarks[index].x * width,
    y: landmarks[index].y * height,
  };
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cutEllipse(
  context: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radiusX: number,
  radiusY: number,
): void {
  context.beginPath();
  context.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
}

function drawSkinMask(
  context: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
): void {
  const first = point(landmarks, FACE_OVAL[0], width, height);
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (const index of FACE_OVAL.slice(1)) {
    const current = point(landmarks, index, width, height);
    context.lineTo(current.x, current.y);
  }
  context.closePath();
  context.fillStyle = "white";
  context.fill();

  const leftEyeOuter = point(landmarks, 33, width, height);
  const leftEyeInner = point(landmarks, 133, width, height);
  const rightEyeInner = point(landmarks, 362, width, height);
  const rightEyeOuter = point(landmarks, 263, width, height);
  const mouthLeft = point(landmarks, 61, width, height);
  const mouthRight = point(landmarks, 291, width, height);
  const nose = point(landmarks, 1, width, height);
  const faceLeft = point(landmarks, 234, width, height);
  const faceRight = point(landmarks, 454, width, height);

  const leftEyeWidth = distance(leftEyeOuter, leftEyeInner);
  const rightEyeWidth = distance(rightEyeInner, rightEyeOuter);
  const mouthWidth = distance(mouthLeft, mouthRight);
  const faceWidth = distance(faceLeft, faceRight);

  context.save();
  context.globalCompositeOperation = "destination-out";
  context.fillStyle = "black";
  cutEllipse(
    context,
    {
      x: (leftEyeOuter.x + leftEyeInner.x) / 2,
      y: (leftEyeOuter.y + leftEyeInner.y) / 2 - leftEyeWidth * 0.18,
    },
    leftEyeWidth * 0.85,
    leftEyeWidth * 0.55,
  );
  cutEllipse(
    context,
    {
      x: (rightEyeOuter.x + rightEyeInner.x) / 2,
      y: (rightEyeOuter.y + rightEyeInner.y) / 2 - rightEyeWidth * 0.18,
    },
    rightEyeWidth * 0.85,
    rightEyeWidth * 0.55,
  );
  cutEllipse(
    context,
    {
      x: (mouthLeft.x + mouthRight.x) / 2,
      y: (mouthLeft.y + mouthRight.y) / 2,
    },
    mouthWidth * 0.62,
    mouthWidth * 0.38,
  );
  cutEllipse(context, nose, faceWidth * 0.07, faceWidth * 0.085);
  context.restore();
}

/**
 * 최종 선택 사진의 얼굴 피부 영역에만 약한 스무딩을 적용한다.
 * 모델을 못 불러오거나 얼굴을 찾지 못하면 원본을 그대로 유지한다.
 */
export async function applyFaceBeautify(
  canvas: HTMLCanvasElement,
): Promise<boolean> {
  const landmarker = await getLandmarker();
  if (!landmarker) return false;

  const { width, height } = canvas;
  const detectionScale = Math.min(1, MAX_DETECTION_WIDTH / width);
  const detectionCanvas = document.createElement("canvas");
  detectionCanvas.width = Math.max(1, Math.round(width * detectionScale));
  detectionCanvas.height = Math.max(1, Math.round(height * detectionScale));
  const detectionContext = detectionCanvas.getContext("2d");
  if (!detectionContext) return false;
  detectionContext.drawImage(
    canvas,
    0,
    0,
    detectionCanvas.width,
    detectionCanvas.height,
  );

  let faces: NormalizedLandmark[][];
  try {
    faces = landmarker.detect(detectionCanvas).faceLandmarks;
  } catch (error) {
    console.warn("얼굴 인식에 실패해 기본 보정만 사용합니다.", error);
    return false;
  }
  if (faces.length === 0) return false;

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskContext = maskCanvas.getContext("2d");
  if (!maskContext) return false;
  for (const landmarks of faces) {
    drawSkinMask(maskContext, landmarks, width, height);
  }

  const featheredMask = document.createElement("canvas");
  featheredMask.width = width;
  featheredMask.height = height;
  const featheredContext = featheredMask.getContext("2d");
  if (!featheredContext) return false;
  featheredContext.filter = `blur(${Math.max(6, Math.round(width * 0.008))}px)`;
  featheredContext.drawImage(maskCanvas, 0, 0);

  const softenedCanvas = document.createElement("canvas");
  softenedCanvas.width = width;
  softenedCanvas.height = height;
  const softenedContext = softenedCanvas.getContext("2d");
  if (!softenedContext) return false;
  softenedContext.filter = `blur(${Math.max(2, Math.round(width / 420))}px)`;
  softenedContext.drawImage(canvas, 0, 0);
  softenedContext.globalCompositeOperation = "destination-in";
  softenedContext.filter = "none";
  softenedContext.drawImage(featheredMask, 0, 0);

  const context = canvas.getContext("2d");
  if (!context) return false;
  context.save();
  context.globalAlpha = 0.3;
  context.drawImage(softenedCanvas, 0, 0);
  context.restore();
  return true;
}
