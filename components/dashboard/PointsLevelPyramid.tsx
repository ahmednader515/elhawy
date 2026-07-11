"use client";

import { useT, useLocale } from "@/components/LocaleProvider";
import { interpolate } from "@/lib/i18n/interpolate";
import { MAX_LEVEL, getLevelTitle } from "@/lib/gamification-shared";

type Props = {
  currentLevel: number;
  maxLevel?: boolean;
};

function tierWidthPercent(level: number): number {
  if (MAX_LEVEL <= 1) return 100;
  return 100 - ((level - 1) / (MAX_LEVEL - 1)) * 52;
}

function PyramidClimber() {
  return (
    <svg
      className="wizard-pyramid-climber-icon"
      viewBox="0 0 24 32"
      aria-hidden
    >
      <circle cx="12" cy="5" r="4" fill="currentColor" />
      <path
        d="M6 14c0-2 2.5-4 6-4s6 2 6 4v3H6v-3z"
        fill="currentColor"
      />
      <path
        d="M8 17v10M16 17v10M8 22l-3 6M16 22l3 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M4 12l8-6 8 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      className="wizard-pyramid-trophy-icon"
      viewBox="0 0 48 48"
      aria-hidden
    >
      <path
        d="M14 8h20v6c0 6-4 11-10 11S14 20 14 14V8z"
        fill="var(--wizard-gold)"
        stroke="#b8860b"
        strokeWidth="1.5"
      />
      <path d="M10 10h4v4c0 3-2 5-4 5V10zM34 10h4v9c-2 0-4-2-4-5v-4z" fill="var(--wizard-gold)" />
      <rect x="18" y="25" width="12" height="4" rx="1" fill="#b8860b" />
      <rect x="16" y="29" width="16" height="5" rx="2" fill="var(--wizard-gold)" stroke="#b8860b" strokeWidth="1" />
    </svg>
  );
}

export function PointsLevelPyramid({ currentLevel, maxLevel }: Props) {
  const t = useT();
  const locale = useLocale();
  const safeLevel = Math.min(MAX_LEVEL, Math.max(1, currentLevel));
  const atSummit = maxLevel || safeLevel >= MAX_LEVEL;

  const tiers = Array.from({ length: MAX_LEVEL }, (_, i) => MAX_LEVEL - i);

  return (
    <div className="wizard-pyramid">
      {atSummit ? (
        <div className="wizard-pyramid-summit" role="status">
          <span className="wizard-pyramid-sparkle wizard-pyramid-sparkle-a" aria-hidden />
          <span className="wizard-pyramid-sparkle wizard-pyramid-sparkle-b" aria-hidden />
          <span className="wizard-pyramid-sparkle wizard-pyramid-sparkle-c" aria-hidden />
          <TrophyIcon />
          <p className="wizard-pyramid-summit-title">
            {t("dashboard.pointsSystem.congratulations", "Congratulations")}
          </p>
          <p className="wizard-pyramid-summit-subtitle">
            {t("dashboard.pointsSystem.youWin", "You win")}
          </p>
        </div>
      ) : null}

      <div className="wizard-pyramid-tiers" role="list" aria-label={t("dashboard.pointsSystem.pyramidTitle", "Level pyramid")}>
        {tiers.map((level) => {
          const isCurrent = level === safeLevel;
          const isComplete = level < safeLevel;
          const isLocked = level > safeLevel;
          const width = tierWidthPercent(level);

          return (
            <div
              key={level}
              role="listitem"
              className={[
                "wizard-pyramid-tier",
                isCurrent ? "is-current" : "",
                isComplete ? "is-complete" : "",
                isLocked ? "is-locked" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ width: `${width}%` }}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={
                isCurrent
                  ? interpolate(t("dashboard.pointsSystem.youAreHere", "You are here — Level {level}"), {
                      level: String(level),
                    })
                  : interpolate(t("dashboard.pointsSystem.levelLabel", "Level {level}"), {
                      level: String(level),
                    })
              }
            >
              <div className="wizard-pyramid-tier-inner">
                <span className="wizard-pyramid-tier-level">
                  {interpolate(t("dashboard.pointsSystem.levelLabel", "Level {level}"), {
                    level: String(level),
                  })}
                </span>
                <span className="wizard-pyramid-tier-name">{getLevelTitle(level, locale)}</span>
                {isCurrent && !atSummit ? (
                  <span className="wizard-pyramid-climber" aria-hidden>
                    <PyramidClimber />
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
