"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { El_Messiri } from "next/font/google";
import { IntroGate } from "@/components/IntroGate";
import { IntroMarqueeFrame } from "@/components/IntroMarqueeFrame";
import { IntroSceneLayers } from "@/components/IntroSceneLayers";
import { BatSwarmTransition } from "@/components/BatSwarmTransition";
import {
  ensureIntroBackgroundPlaying,
  preloadIntroBackgroundAudio,
  unlockIntroBackgroundAudio,
} from "@/lib/introBackgroundAudio";
import { INTRO_IMAGES } from "@/lib/introImages";
import { hasIntroBeenCompleted, markIntroCompleted } from "@/lib/introSession";
import "./intro-gate.css";

const elMessiri = El_Messiri({
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const MIN_LOADING_MS = 700;

type Phase = "loading" | "ready" | "terms" | "sceneLoading" | "intro" | "bats" | "done";

export function IntroExperience() {
  const router = useRouter();
  const { data: session } = useSession();
  const [skipIntro, setSkipIntro] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [covered, setCovered] = useState(false);

  useLayoutEffect(() => {
    if (session?.user) {
      router.replace("/");
      return;
    }
    if (hasIntroBeenCompleted()) {
      setSkipIntro(true);
      markIntroCompleted();
      router.replace("/");
    }
  }, [router, session]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (skipIntro) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [skipIntro]);

  // Preload background music as early as possible on the intro route.
  useEffect(() => {
    if (skipIntro) return;
    preloadIntroBackgroundAudio();
  }, [skipIntro]);

  // Preload all intro artwork, then advance to the "ready" prompt.
  useEffect(() => {
    if (skipIntro || phase !== "loading") return;

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
      img.onload = () => {
        void img.decode?.().finally(bump);
      };
      img.onerror = bump;
      img.src = src;
    });

    const safety = window.setTimeout(() => {
      if (!cancelled) setPhase("ready");
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [phase, skipIntro]);

  const handleReady = useCallback(() => {
    setPhase("terms");
  }, []);

  const handleTermsAccept = useCallback(() => {
    unlockIntroBackgroundAudio();
    setPhase("sceneLoading");
  }, []);

  const handleSceneReady = useCallback(() => {
    setPhase("intro");
  }, []);

  // Safety net if some scene image never resolves during preload mount.
  useEffect(() => {
    if (phase !== "sceneLoading") return;
    const safety = window.setTimeout(() => {
      setPhase((current) => (current === "sceneLoading" ? "intro" : current));
    }, 10000);
    return () => window.clearTimeout(safety);
  }, [phase]);

  const handleZoomStart = useCallback(() => {
    setPhase("bats");
  }, []);

  const handleBatsCovered = useCallback(() => {
    setCovered(true);
  }, []);

  const handleBatsComplete = useCallback(() => {
    markIntroCompleted();
    ensureIntroBackgroundPlaying();
    setPhase("done");
    router.replace("/");
  }, [router]);

  const showBackdrop =
    phase === "loading" ||
    phase === "ready" ||
    phase === "terms" ||
    phase === "sceneLoading";

  if (skipIntro || phase === "done") {
    return null;
  }

  return (
    <>
      {showBackdrop && <div className="intro-root-backdrop" aria-hidden />}

      {phase === "sceneLoading" && (
        <div className="intro-scene-preload" aria-hidden>
          <IntroSceneLayers gatesOpen={false} onSceneReady={handleSceneReady} />
        </div>
      )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {phase === "loading" && (
              <IntroLoadingScreen
                key="loading"
                progress={progress}
                message="جارٍ تجهيز البوابة…"
              />
            )}
            {phase === "ready" && (
              <IntroReadyGate key="ready" onReady={handleReady} />
            )}
            {phase === "terms" && (
              <IntroTermsGate key="terms" onAccept={handleTermsAccept} />
            )}
            {phase === "sceneLoading" && (
              <IntroLoadingScreen
                key="scene-loading"
                progress={100}
                message="جارٍ بناء المشهد…"
              />
            )}
            {(phase === "intro" || (phase === "bats" && !covered)) && (
              <IntroGate
                key="intro"
                revealMode="hold"
                onZoomStart={handleZoomStart}
                onComplete={() => {}}
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

function IntroLoadingScreen({
  progress,
  message,
}: {
  progress: number;
  message: string;
}) {
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
        <p className="intro-loading-text">
          {message} {progress}%
        </p>
      </div>
    </motion.div>
  );
}

function IntroTermsGate({ onAccept }: { onAccept: () => void }) {
  return (
    <motion.div
      className={`intro-ready intro-terms ${elMessiri.className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      role="dialog"
      aria-modal="true"
      aria-label="شروط الاستخدام"
    >
      <div className="intro-ready-glow" aria-hidden />
      <motion.div
        className="intro-ready-content intro-terms-content"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      >
        <IntroMarqueeFrame>
          <div className="intro-sign-ornament" aria-hidden>
            <span className="intro-sign-ornament-ring" />
            <span className="intro-sign-ornament-core">✦</span>
          </div>

          <h1 className="intro-sign-title">تنبيه هام</h1>

          <div className={`intro-sign-divider ${elMessiri.className}`} aria-hidden>
            <span className="intro-sign-divider-line" />
            <span className="intro-sign-divider-gem">◆</span>
            <span className="intro-sign-divider-line" />
          </div>

          <p className={`intro-sign-subtitle intro-terms-body ${elMessiri.className}`}>
            أتعهد باحترام كل الشروط والضوابط الخاصة بالمنصة في الحفاظ على المحتوى
            العلمي للناشر وعدم نشر أي محتوى تعليمي بدون إذن مسبق.
          </p>
        </IntroMarqueeFrame>

        <button
          type="button"
          onClick={onAccept}
          className={`intro-gate-cta intro-ready-cta intro-terms-cta ${elMessiri.className}`}
        >
          <span className="intro-gate-cta-bg" aria-hidden />
          <span className="intro-gate-cta-border" aria-hidden />
          <span className="intro-gate-cta-label">

          موافق علي الشروط والضوابط</span>
        </button>
        <span className="intro-gate-cta-diamond" aria-hidden />
      </motion.div>
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
