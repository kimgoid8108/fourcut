"use client";

import { useEffect, useRef, useState } from "react";

interface CountdownOverlayProps {
  shotCountdown: number | null;
  flash: boolean;
}

export default function CountdownOverlay({
  shotCountdown,
  flash,
}: CountdownOverlayProps) {
  const [current, setCurrent] = useState<number | null>(null);
  const [previous, setPrevious] = useState<number | null>(null);
  const lastValueRef = useRef<number | null>(null);

  useEffect(() => {
    if (shotCountdown === null) {
      setPrevious(null);
      setCurrent(null);
      lastValueRef.current = null;
      return;
    }

    const last = lastValueRef.current;

    if (last !== null && last !== shotCountdown) {
      setPrevious(last);
      setCurrent(shotCountdown);
      lastValueRef.current = shotCountdown;

      const timer = window.setTimeout(() => setPrevious(null), 480);
      return () => window.clearTimeout(timer);
    }

    setCurrent(shotCountdown);
    lastValueRef.current = shotCountdown;
  }, [shotCountdown]);

  const showCountdown = current !== null;

  if (!showCountdown && !flash) return null;

  return (
    <>
      {showCountdown && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="relative flex h-[9rem] w-[9rem] items-center justify-center overflow-hidden">
            {previous !== null && (
              <span
                aria-hidden
                className="absolute animate-count-exit font-sans text-[8rem] font-bold leading-none text-booth-onvideo"
                style={{ textShadow: "0 0 40px rgba(0,0,0,0.5)" }}
              >
                {previous}
              </span>
            )}
            {current !== null && (
              <span
                className={`absolute font-sans text-[8rem] font-bold leading-none text-booth-onvideo ${
                  previous !== null ? "animate-count-enter" : ""
                }`}
                style={{ textShadow: "0 0 40px rgba(0,0,0,0.5)" }}
              >
                {current}
              </span>
            )}
          </div>
        </div>
      )}

      {flash && (
        <div className="pointer-events-none absolute inset-0 z-40 animate-flash bg-white" />
      )}
    </>
  );
}