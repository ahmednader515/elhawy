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
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
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
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
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
      className="fixed bottom-4 left-4 z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full border border-purple-400/45 bg-black/50 text-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.55),0_0_40px_rgba(124,58,237,0.35),0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-md transition hover:border-purple-300/60 hover:bg-black/60 hover:shadow-[0_0_28px_rgba(168,85,247,0.7),0_0_50px_rgba(124,58,237,0.45),0_8px_24px_rgba(0,0,0,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/80 focus-visible:shadow-[0_0_32px_rgba(168,85,247,0.75),0_0_56px_rgba(124,58,237,0.5)]"
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
