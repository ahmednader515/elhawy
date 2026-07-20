"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { useLocale, useT } from "@/components/LocaleProvider";
import { dateLocaleForUi } from "@/lib/i18n/dashboard-table";
import {
  LUCK_WHEEL_SEGMENTS,
  type LuckWheelSegmentKey,
  getLuckWheelSegmentLabel,
  isLuckWheelSegmentKey,
} from "@/lib/luck-wheel";

type RecentSpin = {
  id: string;
  resultKey: string;
  createdAt: string;
};

const SEGMENT_COUNT = LUCK_WHEEL_SEGMENTS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;
const SPIN_DURATION_S = 11.1;
const EXTRA_TURNS = 5;
const SPIN_AUDIO_SRC = "/intro/audio/spinning-wheel.mp3";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

export function LuckWheelClient() {
  const t = useT();
  const locale = useLocale();
  const C = "dashboard.luckWheel";
  const controls = useAnimation();
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState("");
  const [resultKey, setResultKey] = useState<LuckWheelSegmentKey | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [recentSpins, setRecentSpins] = useState<RecentSpin[]>([]);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const audio = new Audio(SPIN_AUDIO_SRC);
    audio.preload = "auto";
    spinAudioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
      spinAudioRef.current = null;
    };
  }, []);

  const stopSpinSound = useCallback(() => {
    const audio = spinAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const playSpinSound = useCallback(() => {
    const audio = spinAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Autoplay may block until a user gesture; spin click usually unlocks it.
    });
  }, []);

  const labelFor = useCallback(
    (key: string) => {
      if (!isLuckWheelSegmentKey(key)) return key;
      return getLuckWheelSegmentLabel(key, locale === "en" ? "en" : "ar");
    },
    [locale],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/luck-wheel", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t(`${C}.loadFailed`, "Failed to load the wheel"));
        return;
      }
      setEnabled(!!data.enabled);
      setRecentSpins(Array.isArray(data.recentSpins) ? data.recentSpins : []);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const slices = useMemo(() => {
    const cx = 160;
    const cy = 160;
    const r = 150;
    return LUCK_WHEEL_SEGMENTS.map((seg, i) => {
      const startAngle = i * SEGMENT_ANGLE;
      const endAngle = (i + 1) * SEGMENT_ANGLE;
      const mid = startAngle + SEGMENT_ANGLE / 2;
      const labelPos = polarToCartesian(cx, cy, r * 0.62, mid);
      return {
        ...seg,
        path: describeSlice(cx, cy, r, startAngle, endAngle),
        labelX: labelPos.x,
        labelY: labelPos.y,
        mid,
        displayLabel: locale === "en" ? seg.labelEn : seg.labelAr,
      };
    });
  }, [locale]);

  async function handleSpin() {
    if (!enabled || spinning) return;
    setError("");
    setShowResult(false);
    setResultKey(null);
    setSpinning(true);

    try {
      const res = await fetch("/api/luck-wheel/spin", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t(`${C}.spinFailed`, "Could not spin"));
        setSpinning(false);
        if (res.status === 403) setEnabled(false);
        return;
      }

      const index = typeof data.index === "number" ? data.index : 0;
      const key = isLuckWheelSegmentKey(data.resultKey) ? data.resultKey : null;

      // Pointer is fixed at top; land slice center under pointer.
      const targetMod = (360 - (index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2) + 360) % 360;
      const currentMod = ((rotation % 360) + 360) % 360;
      let delta = targetMod - currentMod;
      if (delta <= 0) delta += 360;
      const nextRotation = rotation + EXTRA_TURNS * 360 + delta;

      setRotation(nextRotation);
      playSpinSound();
      await controls.start({
        rotate: nextRotation,
        transition: { duration: SPIN_DURATION_S, ease: [0.15, 0.85, 0.15, 1] },
      });
      stopSpinSound();

      setResultKey(key);
      setShowResult(true);
      if (data.spinId && data.resultKey) {
        setRecentSpins((prev) => [
          {
            id: String(data.spinId),
            resultKey: String(data.resultKey),
            createdAt: String(data.createdAt ?? new Date().toISOString()),
          },
          ...prev,
        ].slice(0, 8));
      }
    } catch {
      stopSpinSound();
      setError(t(`${C}.spinFailed`, "Could not spin"));
    } finally {
      setSpinning(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        {t(`${C}.loading`, "Loading…")}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {!enabled && (
        <div
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]"
          role="status"
        >
          {t(
            `${C}.disabledMessage`,
            "The luck wheel is closed right now. Check back when the admin opens it.",
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col items-center gap-6">
        <div className="relative w-full max-w-[min(100%,560px)] aspect-square">
          {/* Pointer */}
          <div
            className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1"
            aria-hidden
          >
            <div
              className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent"
              style={{ borderTopColor: "var(--color-primary)" }}
            />
          </div>

          <motion.div
            className="h-full w-full"
            animate={controls}
            initial={{ rotate: 0 }}
          >
            <svg viewBox="0 0 320 320" className="h-full w-full drop-shadow-md" role="img" aria-label={t(`${C}.pageTitle`, "Luck wheel")}>
              <circle cx="160" cy="160" r="156" fill="var(--color-border)" />
              {slices.map((slice) => (
                <g key={slice.key}>
                  <path d={slice.path} fill={slice.color} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
                  <text
                    x={slice.labelX}
                    y={slice.labelY}
                    fill={slice.textColor}
                    fontSize="13"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${slice.mid}, ${slice.labelX}, ${slice.labelY})`}
                  >
                    {slice.displayLabel}
                  </text>
                </g>
              ))}
              <circle cx="160" cy="160" r="28" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="3" />
              <circle cx="160" cy="160" r="10" fill="var(--color-primary)" />
            </svg>
          </motion.div>
        </div>

        <button
          type="button"
          onClick={() => void handleSpin()}
          disabled={!enabled || spinning}
          className="min-w-[220px] rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-8 py-3.5 text-base font-semibold text-white transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {spinning
            ? t(`${C}.spinning`, "Spinning…")
            : t(`${C}.spinButton`, "Spin the wheel")}
        </button>
      </div>

      {showResult && resultKey && (
        <div
          className="mx-auto max-w-md rounded-[var(--radius-card)] border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-5 py-4 text-center"
          role="status"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {t(`${C}.resultTitle`, "Your result")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
            {labelFor(resultKey)}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t(`${C}.resultNote`, "For fun only — nothing is applied to your account.")}
          </p>
        </div>
      )}

      {recentSpins.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            {t(`${C}.recentTitle`, "Your recent spins")}
          </h3>
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            {recentSpins.map((spin) => (
              <li
                key={spin.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-[var(--color-foreground)]">
                  {labelFor(spin.resultKey)}
                </span>
                <time className="shrink-0 text-xs text-[var(--color-muted)]" dateTime={spin.createdAt}>
                  {new Date(spin.createdAt).toLocaleString(dateLocaleForUi(locale), {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </time>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
