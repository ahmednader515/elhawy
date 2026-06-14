"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { El_Messiri } from "next/font/google";
import { useIntroAudio } from "@/hooks/useIntroAudio";
import { IntroMarqueeTitle } from "@/components/IntroMarqueeTitle";
import { IntroSceneLayers } from "@/components/IntroSceneLayers";
import "./intro-gate.css";

const elMessiri = El_Messiri({
  subsets: ["arabic"],
  weight: ["600", "700"],
  display: "swap",
});

const GATE_OPEN_DURATION = 2;
const GATE_OPEN_HOLD = 0.9;
const ZOOM_IN_DURATION = 1.2;
const FADE_OUT_DURATION = 1;

type IntroGateProps = {
  onComplete: () => void;
  /**
   * "fade" (default) fades the whole intro out to reveal what's behind it.
   * "hold" keeps the final zoomed frame fully opaque and hands off via
   * onComplete (used when a separate transition performs the reveal).
   */
  revealMode?: "fade" | "hold";
};

type SequencePhase = "idle" | "sequence" | "entering" | "exiting";

const HOLD_EXIT_MS = 200;

export function IntroGate({ onComplete, revealMode = "fade" }: IntroGateProps) {
  const { play } = useIntroAudio();
  const [phase, setPhase] = useState<SequencePhase>("idle");
  const [gatesOpen, setGatesOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timersRef = useRef<number[]>([]);
  const gateCompleteRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const schedule = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(fn, delayMs);
    timersRef.current.push(id);
  }, []);

  const handleGateOpenComplete = useCallback(() => {
    if (gateCompleteRef.current) return;
    gateCompleteRef.current = true;
    setPhase("entering");
  }, []);

  const handleOpenGate = useCallback(() => {
    if (phase !== "idle") return;

    gateCompleteRef.current = false;
    setPhase("sequence");
    play("click");

    schedule(() => {
      play("gateOpen");
      setGatesOpen(true);
    }, 120);

    schedule(() => {
      play("magic");
    }, 380);

    schedule(() => {
      handleGateOpenComplete();
    }, Math.round((GATE_OPEN_DURATION + GATE_OPEN_HOLD) * 1000));
  }, [phase, play, schedule, handleGateOpenComplete]);

  const handleFadeOutComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (phase !== "entering") return;
    const id = window.setTimeout(() => {
      setPhase("exiting");
    }, ZOOM_IN_DURATION * 1000);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const delay =
      revealMode === "hold" ? HOLD_EXIT_MS : FADE_OUT_DURATION * 1000 + 80;
    const id = window.setTimeout(handleFadeOutComplete, delay);
    return () => window.clearTimeout(id);
  }, [phase, handleFadeOutComplete, revealMode]);

  if (!mounted) return null;

  const isZooming = phase === "entering" || phase === "exiting";

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        key="intro-gate"
        className="intro-scene fixed inset-0 z-[10000] touch-none select-none"
        role="dialog"
        aria-modal="true"
        aria-label="مقدمة أكاديمية الحاوي"
        initial={{ opacity: 1 }}
        animate={{
          opacity: phase === "exiting" && revealMode === "fade" ? 0 : 1,
        }}
        transition={{ duration: FADE_OUT_DURATION, ease: "easeInOut" }}
      >
        {/* Layered world — zooms on enter */}
        <motion.div
          className="intro-scene-world absolute inset-0"
          style={{ transformOrigin: "50% 48%" }}
          animate={{
            scale: isZooming ? 1.75 : 1,
          }}
          transition={{
            duration: ZOOM_IN_DURATION,
            ease: [0.45, 0, 0.15, 1],
          }}
        >
          <IntroSceneLayers gatesOpen={gatesOpen} />
        </motion.div>

        <div className="intro-scene-vignette pointer-events-none absolute inset-0 z-[5]" aria-hidden />

        {/* UI overlay */}
        <div className="intro-scene-ui pointer-events-none absolute inset-0 z-20 flex flex-col">
          <motion.header
            className="intro-scene-header pointer-events-none flex shrink-0 justify-center px-4"
            initial={{ opacity: 0, y: -16 }}
            animate={{
              opacity: phase === "idle" ? 1 : 0,
              y: phase === "idle" ? 0 : -10,
            }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <IntroMarqueeTitle />
          </motion.header>

          <div className="min-h-0 flex-1" />

          <motion.footer
            className="intro-scene-footer pointer-events-auto flex shrink-0 flex-col items-center px-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{
              opacity: phase === "idle" ? 1 : 0,
              y: phase === "idle" ? 0 : 10,
            }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <button
              type="button"
              onClick={handleOpenGate}
              disabled={phase !== "idle"}
              className={`intro-gate-cta ${elMessiri.className}`}
              aria-hidden={phase !== "idle"}
              tabIndex={phase === "idle" ? 0 : -1}
            >
              <span className="intro-gate-cta-bg" aria-hidden />
              <span className="intro-gate-cta-border" aria-hidden />
              <span className="intro-gate-cta-label">افتح البوابة</span>
            </button>
            <span className="intro-gate-cta-diamond" aria-hidden />
          </motion.footer>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
