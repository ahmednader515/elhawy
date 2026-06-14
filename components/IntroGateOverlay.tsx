"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { El_Messiri } from "next/font/google";
import { IntroGate } from "@/components/IntroGate";
import { IntroMarqueeFrame } from "@/components/IntroMarqueeFrame";
import { BatSwarmTransition } from "@/components/BatSwarmTransition";
import { ensureIntroBackgroundPlaying } from "@/lib/introBackgroundAudio";
import "./intro-gate.css";

const elMessiri = El_Messiri({
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const INTRO_IMAGES = [
  "/intro/clouds.png",
  "/intro/moon.png",
  "/intro/left-castle.png",
  "/intro/right-castle.png",
  "/intro/left-tree.png",
  "/intro/right-tree.png",
  "/intro/fence.png",
  "/intro/ground.png",
  "/intro/gate-left.png",
  "/intro/gate-right.png",
  "/intro/left-column.png",
  "/intro/right-column.png",
  "/intro/left-flame.png",
  "/intro/right-flame.png",
  "/intro/tombstone.png",
  "/intro/rocks.png",
  "/intro/fog.png",
  "/intro/particles.png",
];

const MIN_LOADING_MS = 700;

type Phase = "loading" | "ready" | "intro" | "bats" | "done";

export function IntroGateOverlay() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll for every phase except the final dismissal.
  useEffect(() => {
    if (phase === "done") return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  // Preload all intro artwork, then advance to the "ready" prompt.
  useEffect(() => {
    if (phase !== "loading") return;

    let cancelled = false;
    let loaded = 0;
    const total = INTRO_IMAGES.length;
    const startedAt = Date.now();

    const finish = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_LOADING_MS - elapsed);
      window.setTimeout(() => {
        if (!cancelled) setPhase("ready");
      }, wait);
    };

    const bump = () => {
      if (cancelled) return;
      loaded += 1;
      setProgress(Math.round((loaded / total) * 100));
      if (loaded >= total) finish();
    };

    INTRO_IMAGES.forEach((src) => {
      const img = new Image();
      img.onload = bump;
      img.onerror = bump;
      img.src = src;
    });

    // Safety net in case some asset never resolves.
    const safety = window.setTimeout(() => {
      if (!cancelled) setPhase("ready");
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [phase]);

  const handleReady = useCallback(() => {
    // This runs from a user click — the gesture that unlocks audio.
    ensureIntroBackgroundPlaying();
    setPhase("intro");
  }, []);

  const handleIntroComplete = useCallback(() => {
    setPhase("bats");
  }, []);

  const handleBatsCovered = useCallback(() => {
    setCovered(true);
  }, []);

  const handleBatsComplete = useCallback(() => {
    setPhase("done");
  }, []);

  if (phase === "done") return null;

  // The intro scene is opaque and handles its own reveal, so the solid backdrop
  // is only needed while the loading/ready overlays crossfade.
  const showBackdrop = phase === "loading" || phase === "ready";

  return (
    <>
      {/* Server-rendered opaque backdrop — present from first paint, hides the
          homepage and stays solid through the loading→ready crossfade. */}
      {showBackdrop && <div className="intro-root-backdrop" aria-hidden />}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {phase === "loading" && (
              <IntroLoadingScreen key="loading" progress={progress} />
            )}
            {phase === "ready" && (
              <IntroReadyGate key="ready" onReady={handleReady} />
            )}
            {(phase === "intro" || (phase === "bats" && !covered)) && (
              <IntroGate
                key="intro"
                revealMode="hold"
                onComplete={handleIntroComplete}
              />
            )}
            {phase === "bats" && (
              <BatSwarmTransition
                key="bats"
                onCovered={handleBatsCovered}
                onComplete={handleBatsComplete}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function IntroLoadingScreen({ progress }: { progress: number }) {
  return (
    <motion.div
      className={`intro-loading ${elMessiri.className}`}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      role="status"
      aria-live="polite"
      aria-label="جاري التحميل"
    >
      <div className="intro-loading-glow" aria-hidden />
      <div className="intro-loading-content">
        <div className="intro-loading-ring" aria-hidden>
          <span className="intro-loading-ring-core">✦</span>
        </div>
        <p className="intro-loading-title">أكاديمية الحاوي</p>
        <div className="intro-loading-bar" aria-hidden>
          <span
            className="intro-loading-bar-fill"
            style={{ width: `${Math.max(6, progress)}%` }}
          />
        </div>
        <p className="intro-loading-text">جارٍ تجهيز البوابة… {progress}%</p>
      </div>
    </motion.div>
  );
}

function IntroReadyGate({ onReady }: { onReady: () => void }) {
  return (
    <motion.div
      className={`intro-ready ${elMessiri.className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      role="dialog"
      aria-modal="true"
      aria-label="هل أنت مستعد؟"
    >
      <div className="intro-ready-glow" aria-hidden />
      <motion.div
        className="intro-ready-content"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      >
        <IntroMarqueeFrame>
          <div className="intro-sign-ornament" aria-hidden>
            <span className="intro-sign-ornament-ring" />
            <span className="intro-sign-ornament-core">✦</span>
          </div>

          <h1 className="intro-sign-title">هل أنت مستعد؟</h1>

          <div className={`intro-sign-divider ${elMessiri.className}`} aria-hidden>
            <span className="intro-sign-divider-line" />
            <span className="intro-sign-divider-gem">◆</span>
            <span className="intro-sign-divider-line" />
          </div>

          <p className={`intro-sign-subtitle ${elMessiri.className}`}>
            بوابة المعرفة على وشك أن تُفتح
          </p>
        </IntroMarqueeFrame>

        <button
          type="button"
          onClick={onReady}
          className={`intro-gate-cta intro-ready-cta ${elMessiri.className}`}
        >
          <span className="intro-gate-cta-bg" aria-hidden />
          <span className="intro-gate-cta-border" aria-hidden />
          <span className="intro-gate-cta-label">نعم، لنبدأ</span>
        </button>
        <span className="intro-gate-cta-diamond" aria-hidden />
      </motion.div>
    </motion.div>
  );
}
