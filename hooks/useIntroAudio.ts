"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AUDIO_SOURCES = {
  click: "/intro/audio/click.mp3",
  gateOpen: "/intro/audio/gate-open.mp3",
  magic: "/intro/audio/magic.mp3",
} as const;

const BACKGROUND_SRC = "/intro/audio/background.mp3";
const BACKGROUND_VOLUME = 0.45;
/** Trim this many seconds from the track tail so loops restart without a pause. */
const BACKGROUND_LOOP_TRIM = 0.85;

type AudioKey = keyof typeof AUDIO_SOURCES;

function createAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = "auto";
  return audio;
}

function createBackgroundAudio(): HTMLAudioElement {
  const audio = createAudio(BACKGROUND_SRC);
  audio.loop = false;
  audio.volume = BACKGROUND_VOLUME;
  audio.autoplay = true;
  return audio;
}

function tryPlayBackground(
  background: HTMLAudioElement,
  isMuted: boolean,
): Promise<void> {
  if (isMuted) return Promise.resolve();
  return background.play().catch(() => Promise.resolve());
}

export function useIntroAudio() {
  const poolRef = useRef<Partial<Record<AudioKey, HTMLAudioElement>>>({});
  const backgroundRef = useRef<HTMLAudioElement | null>(null);
  const isMutedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const backgroundInitRef = useRef(false);

  if (typeof window !== "undefined" && !backgroundInitRef.current) {
    backgroundInitRef.current = true;
    const background = createBackgroundAudio();
    backgroundRef.current = background;
    void tryPlayBackground(background, isMutedRef.current);
  }

  useEffect(() => {
    const pool = poolRef.current;
    (Object.keys(AUDIO_SOURCES) as AudioKey[]).forEach((key) => {
      pool[key] = createAudio(AUDIO_SOURCES[key]);
    });

    const background = backgroundRef.current ?? createBackgroundAudio();
    backgroundRef.current = background;

    const restartBackgroundLoop = () => {
      background.currentTime = 0;
      void tryPlayBackground(background, isMutedRef.current);
    };

    const handleBackgroundTimeUpdate = () => {
      const { duration, currentTime } = background;
      if (!Number.isFinite(duration) || duration <= BACKGROUND_LOOP_TRIM) return;
      if (currentTime >= duration - BACKGROUND_LOOP_TRIM) {
        restartBackgroundLoop();
      }
    };

    background.addEventListener("timeupdate", handleBackgroundTimeUpdate);
    background.addEventListener("ended", restartBackgroundLoop);

    const startBackground = () => {
      void tryPlayBackground(background, isMutedRef.current);
    };

    startBackground();

    const handleCanPlay = () => startBackground();
    background.addEventListener("canplaythrough", handleCanPlay);
    background.addEventListener("loadeddata", handleCanPlay);

    const retryDelays = [150, 400, 800, 1500];
    const retryIds = retryDelays.map((delay) =>
      window.setTimeout(startBackground, delay),
    );

    const handleWindowLoad = () => startBackground();
    window.addEventListener("load", handleWindowLoad);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") startBackground();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const resumeOnInteraction = () => {
      if (!isMutedRef.current && background.paused) startBackground();
    };

    window.addEventListener("pointerdown", resumeOnInteraction);
    window.addEventListener("keydown", resumeOnInteraction);

    return () => {
      window.removeEventListener("pointerdown", resumeOnInteraction);
      window.removeEventListener("keydown", resumeOnInteraction);
      window.removeEventListener("load", handleWindowLoad);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      background.removeEventListener("canplaythrough", handleCanPlay);
      background.removeEventListener("loadeddata", handleCanPlay);
      background.removeEventListener("timeupdate", handleBackgroundTimeUpdate);
      background.removeEventListener("ended", restartBackgroundLoop);
      retryIds.forEach((id) => window.clearTimeout(id));

      (Object.keys(pool) as AudioKey[]).forEach((key) => {
        const audio = pool[key];
        if (!audio) return;
        audio.pause();
        audio.src = "";
        delete pool[key];
      });

      background.pause();
      background.src = "";
      backgroundRef.current = null;
    };
  }, []);

  const play = useCallback((key: AudioKey) => {
    const audio = poolRef.current[key];
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Autoplay policies may block until user gesture — click handler satisfies this.
    });
  }, []);

  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current;
    setIsMuted(isMutedRef.current);

    const background = backgroundRef.current;
    if (!background) return;

    background.muted = isMutedRef.current;
    if (!isMutedRef.current) {
      void tryPlayBackground(background, false);
    }
  }, []);

  return { play, isMuted, toggleMute };
}
