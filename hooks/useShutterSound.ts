"use client";

import { useCallback, useEffect, useRef } from "react";

function createShutterBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * 0.18),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  let previousNoise = 0;

  // 두 번의 짧은 기계식 클릭을 합성한다. 외부 음원 다운로드가 필요 없다.
  for (let i = 0; i < samples.length; i += 1) {
    const time = i / context.sampleRate;
    const secondClickTime = time - 0.065;
    const envelope =
      Math.min(1, time / 0.001) * Math.exp(-time / 0.012) +
      (secondClickTime >= 0
        ? 0.75 * Math.min(1, secondClickTime / 0.001) *
          Math.exp(-secondClickTime / 0.02)
        : 0);
    const noise = Math.random() * 2 - 1;
    samples[i] = (noise - previousNoise * 0.7) * envelope * 0.2;
    previousNoise = noise;
  }

  return buffer;
}

export function useShutterSound() {
  const contextRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  // Safari의 소리 재생 권한을 위해 촬영 시작 버튼의 클릭 핸들러에서 호출한다.
  const prepareShutterSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;

      let context = contextRef.current;
      if (!context || context.state === "closed") {
        context = new AudioContextClass();
        contextRef.current = context;
        bufferRef.current = createShutterBuffer(context);
      }

      void context.resume().catch(() => {
        // 소리 권한/오디오 출력 실패는 사진 촬영을 막지 않는다.
      });
    } catch {
      // Web Audio를 사용할 수 없는 기기에서도 촬영은 계속한다.
    }
  }, []);

  const playShutterSound = useCallback(() => {
    const context = contextRef.current;
    const buffer = bufferRef.current;
    if (!context || context.state !== "running" || !buffer) return;

    try {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => source.disconnect();
      source.start();
    } catch {
      // 효과음이 실패해도 해당 컷은 정상 촬영한다.
    }
  }, []);

  useEffect(() => () => {
    const context = contextRef.current;
    contextRef.current = null;
    bufferRef.current = null;
    if (context && context.state !== "closed") {
      void context.close().catch(() => {});
    }
  }, []);

  return { prepareShutterSound, playShutterSound };
}
