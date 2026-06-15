"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  ensureIntroBackgroundPlaying,
  getIntroBackgroundMuted,
  subscribeIntroBackgroundMuted,
  toggleIntroBackgroundMuted,
} from "@/lib/introBackgroundAudio";
import { useT } from "@/components/LocaleProvider";

function VolumeOnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5 6 9H3v6h3l5 4V5Zm7.5 4.5a4.5 4.5 0 0 1 0 5M16 7.5a7.5 7.5 0 0 1 0 9"
      />
    </svg>
  );
}

function VolumeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5 6 9H3v6h3l5 4V5ZM22 9l-6 6M16 9l6 6"
      />
    </svg>
  );
}

export function BackgroundMusicMute() {
  const t = useT();
  const muted = useSyncExternalStore(
    subscribeIntroBackgroundMuted,
    getIntroBackgroundMuted,
    () => false,
  );

  useEffect(() => {
    ensureIntroBackgroundPlaying();
  }, []);

  const handleToggle = useCallback(() => {
    toggleIntroBackgroundMuted();
  }, []);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="fixed bottom-4 left-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-black/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70"
      aria-label={
        muted
          ? t("audio.unmute", "Unmute background music")
          : t("audio.mute", "Mute background music")
      }
      aria-pressed={muted}
      title={
        muted
          ? t("audio.unmute", "Unmute background music")
          : t("audio.mute", "Mute background music")
      }
    >
      {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
    </button>
  );
}
