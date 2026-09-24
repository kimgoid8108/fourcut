const DB_NAME = "yangmun-necut";
const DB_VERSION = 2;
const STORE_NAME = "completed-results";
const LEGACY_RESULT_KEY = "last-result";
const LEGACY_STORAGE_KEY = "yangmun-necut:last-result";
const MAX_SAVED_RESULTS = 20;

export interface PersistedResult {
  capturedAt: string;
  imageDataUrl: string;
}

export interface PersistedResultSummary {
  id: string;
  capturedAt: string;
  thumbnailUrl: string;
}

interface StoredResult {
  capturedAt: string;
  imageBlob: Blob;
  thumbnailBlob?: Blob;
}

function isStoredResult(value: unknown): value is StoredResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Partial<StoredResult>;
  return (
    typeof result.capturedAt === "string" &&
    !Number.isNaN(Date.parse(result.capturedAt)) &&
    result.imageBlob instanceof Blob &&
    result.imageBlob.type.startsWith("image/") &&
    (result.thumbnailBlob === undefined || result.thumbnailBlob instanceof Blob)
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = request.result;
      const store = database.objectStoreNames.contains(STORE_NAME)
        ? request.transaction?.objectStore(STORE_NAME)
        : database.createObjectStore(STORE_NAME);

      // v1에서 한 장만 저장하던 고정 키를 촬영 시각 키로 이전한다.
      if ((event as IDBVersionChangeEvent).oldVersion < 2 && store) {
        const legacyRequest = store.get(LEGACY_RESULT_KEY);
        legacyRequest.onsuccess = () => {
          if (isStoredResult(legacyRequest.result)) {
            store.put(legacyRequest.result, legacyRequest.result.capturedAt);
          }
          store.delete(LEGACY_RESULT_KEY);
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("사진 저장소를 열 수 없습니다."));
  });
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((response) => {
    if (!response.ok) throw new Error("사진 데이터를 변환하지 못했습니다.");
    return response.blob();
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("저장된 사진을 읽지 못했습니다."));
    reader.readAsDataURL(blob);
  });
}

async function createThumbnail(imageBlob: Blob): Promise<Blob> {
  const objectUrl = URL.createObjectURL(imageBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("미리보기를 만들지 못했습니다."));
      element.src = objectUrl;
    });

    const width = 180;
    const height = Math.max(
      1,
      Math.round((image.naturalHeight / image.naturalWidth) * width),
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context unavailable");
    context.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("미리보기 변환 실패")),
        "image/jpeg",
        0.72,
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function readStoredResults(): Promise<StoredResult[]> {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).getAll();
        let results: StoredResult[] = [];

        request.onsuccess = () => {
          results = (request.result as unknown[])
            .filter(isStoredResult)
            .sort(
              (a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt),
            )
            .slice(0, MAX_SAVED_RESULTS);
        };
        transaction.oncomplete = () => {
          database.close();
          resolve(results);
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error);
        };
      }),
  );
}

async function writePersistedResult(
  payload: PersistedResult,
): Promise<boolean> {
  try {
    const imageBlob = await dataUrlToBlob(payload.imageDataUrl);
    const thumbnailBlob = await createThumbnail(imageBlob).catch(
      () => imageBlob,
    );
    const database = await openDatabase();

    return await new Promise((resolve) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put(
        {
          capturedAt: payload.capturedAt,
          imageBlob,
          thumbnailBlob,
        } satisfies StoredResult,
        payload.capturedAt,
      );

      const keysRequest = store.getAllKeys();
      keysRequest.onsuccess = () => {
        const keys = keysRequest.result
          .filter(
            (key): key is string =>
              typeof key === "string" && !Number.isNaN(Date.parse(key)),
          )
          .sort((a, b) => Date.parse(b) - Date.parse(a));

        for (const oldKey of keys.slice(MAX_SAVED_RESULTS)) {
          store.delete(oldKey);
        }
      };

      transaction.oncomplete = () => {
        database.close();
        resolve(true);
      };
      transaction.onerror = () => {
        database.close();
        resolve(false);
      };
      transaction.onabort = () => {
        database.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

// QR 합성 전 사진과 합성 후 사진의 저장이 겹쳐도 마지막 요청이 최종 결과가
// 되도록 IndexedDB 쓰기를 순서대로 실행한다.
let saveQueue: Promise<boolean> = Promise.resolve(true);

export function savePersistedResult(
  payload: PersistedResult,
): Promise<boolean> {
  saveQueue = saveQueue.then(
    () => writePersistedResult(payload),
    () => writePersistedResult(payload),
  );
  return saveQueue;
}

function parseLegacyResult(raw: string | null): PersistedResult | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const capturedAt = parsed.capturedAt;
    const imageDataUrl =
      parsed.imageDataUrl ?? parsed.finalStripDataUrl ?? parsed.stripDataUrl;

    if (
      typeof capturedAt !== "string" ||
      Number.isNaN(Date.parse(capturedAt)) ||
      typeof imageDataUrl !== "string" ||
      !imageDataUrl.startsWith("data:image/")
    ) {
      return null;
    }

    return { capturedAt, imageDataUrl };
  } catch {
    return null;
  }
}

function loadLegacyResult(): PersistedResult | null {
  try {
    const results = [
      parseLegacyResult(localStorage.getItem(LEGACY_STORAGE_KEY)),
      parseLegacyResult(sessionStorage.getItem(LEGACY_STORAGE_KEY)),
    ];

    return (
      results
        .filter((result): result is PersistedResult => result !== null)
        .sort(
          (a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt),
        )[0] ?? null
    );
  } catch {
    return null;
  }
}

function clearLegacyResult(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // 이전 저장소 정리에 실패해도 IndexedDB 결과에는 영향이 없다.
  }
}

async function migrateLegacyResult(): Promise<PersistedResult | null> {
  const legacyResult = loadLegacyResult();
  if (!legacyResult) return null;

  if (await savePersistedResult(legacyResult)) {
    clearLegacyResult();
  }
  return legacyResult;
}

export async function loadPersistedResult(
  id?: string,
): Promise<PersistedResult | null> {
  await saveQueue;

  try {
    const storedResults = await readStoredResults();
    const stored = id
      ? storedResults.find((result) => result.capturedAt === id)
      : storedResults[0];

    if (stored) {
      return {
        capturedAt: stored.capturedAt,
        imageDataUrl: await blobToDataUrl(stored.imageBlob),
      };
    }
  } catch {
    // IndexedDB에 아직 결과가 없거나 열 수 없으면 이전 저장소를 확인한다.
  }

  return id ? null : migrateLegacyResult();
}

export async function hasPersistedResults(): Promise<boolean> {
  await saveQueue;

  const storedResults = await readStoredResults().catch(() => []);
  if (storedResults.length > 0) return true;

  return (await migrateLegacyResult()) !== null;
}

export async function listPersistedResults(): Promise<
  PersistedResultSummary[]
> {
  await saveQueue;

  let storedResults = await readStoredResults().catch(() => []);
  if (storedResults.length === 0 && (await migrateLegacyResult())) {
    storedResults = await readStoredResults().catch(() => []);
  }

  return storedResults.map((result) => ({
    id: result.capturedAt,
    capturedAt: result.capturedAt,
    thumbnailUrl: URL.createObjectURL(
      result.thumbnailBlob ?? result.imageBlob,
    ),
  }));
}
