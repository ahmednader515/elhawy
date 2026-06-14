"use client";

import { useCallback, useEffect, useRef } from "react";
import { ensureIntroBackgroundPlaying } from "@/lib/introBackgroundAudio";

const AUDIO_SOURCES = {
  click: "/intro/audio/click.mp3",
  gateOpen: "/intro/audio/gate-open.mp3",
  magic: "/intro/audio/magic.mp3",
} as const;

type AudioKey = keyof typeof AUDIO_SOURCES;

function createAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = "auto";
  return audio;
}

export function useIntroAudio() {
  const poolRef = useRef<Partial<Record<AudioKey, HTMLAudioElement>>>({});

  useEffect(() => {
    ensureIntroBackgroundPlaying();

    const pool = poolRef.current;
    (Object.keys(AUDIO_SOURCES) as AudioKey[]).forEach((key) => {
      pool[key] = createAudio(AUDIO_SOURCES[key]);
    });

    return () => {
      (Object.keys(pool) as AudioKey[]).forEach((key) => {
        const audio = pool[key];
        if (!audio) return;
        audio.pause();
        audio.src = "";
        delete pool[key];
      });
    };
  }, []);

  const play = useCallback((key: AudioKey) => {
    ensureIntroBackgroundPlaying();

    const audio = poolRef.current[key];
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Autoplay policies may block until user gesture — click handler satisfies this.
    });
  }, []);

  return { play };
}
