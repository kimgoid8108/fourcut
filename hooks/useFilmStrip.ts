"use client";

import { useCallback, useState } from "react";
import { composeFilmStrip } from "@/lib/composeFilmStrip";

interface UseFilmStripResult {
  stripDataUrl: string | null;
  isComposing: boolean;
  error: string | null;
  compose: (frames: string[], capturedAt: Date) => Promise<string | null>;
  reset: () => void;
}

export function useFilmStrip(): UseFilmStripResult {
  const [stripDataUrl, setStripDataUrl] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compose = useCallback(async (frames: string[], capturedAt: Date) => {
    setIsComposing(true);
    setError(null);

    try {
      const dataUrl = await composeFilmStrip(frames, capturedAt);
      setStripDataUrl(dataUrl);
      return dataUrl;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "필름 스트립을 생성하지 못했습니다.";
      setError(message);
      return null;
    } finally {
      setIsComposing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setStripDataUrl(null);
    setError(null);
    setIsComposing(false);
  }, []);

  return { stripDataUrl, isComposing, error, compose, reset };
}