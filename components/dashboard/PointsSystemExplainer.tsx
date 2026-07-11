"use client";

import { useT } from "@/components/LocaleProvider";
import { interpolate } from "@/lib/i18n/interpolate";
import { XP_PER_LEVEL, POINT_EVENT } from "@/lib/gamification-shared";
import type { GamificationPointValues } from "@/lib/gamification-point-settings";
import { PointsLevelPyramid } from "@/components/dashboard/PointsLevelPyramid";

type Props = {
  pointValues: GamificationPointValues;
  currentLevel: number;
  maxLevel?: boolean;
};

const SOURCES = [
  { key: "dashboard.pointsSystem.sourceVideo", event: POINT_EVENT.LESSON_COMPLETE },
  { key: "dashboard.pointsSystem.sourceQuiz", event: POINT_EVENT.QUIZ_PASS },
  { key: "dashboard.pointsSystem.sourceChallenge", event: POINT_EVENT.CHALLENGE_COMPLETE },
  { key: "dashboard.pointsSystem.sourceReferral", event: POINT_EVENT.REFERRAL_APPROVED },
] as const;

export function PointsSystemExplainer({ pointValues, currentLevel, maxLevel }: Props) {
  const t = useT();

  return (
    <div className="wizard-points-card dashboard-wizard">
      <h3 className="wizard-points-card-title">
        <span className="wizard-points-card-title-icon" aria-hidden>
          🔥
        </span>
        {t("dashboard.pointsSystem.pageTitle", "Points system")}
      </h3>

      <p className="mt-3 text-sm font-semibold text-[var(--color-foreground)]">
        {t("dashboard.pointsSystem.dependsOnTitle", "The points system is based on:")}
      </p>

      <ul className="wizard-points-sources" role="list">
        {SOURCES.map(({ key, event }) => (
          <li key={event} className="wizard-points-source">
            <span className="wizard-points-source-arrow" aria-hidden>
              ⬅️
            </span>
            <div className="wizard-points-source-body">
              <p className="wizard-points-source-label">{t(key, key)}</p>
              <p className="wizard-points-source-value">
                {interpolate(t("dashboard.pointsSystem.pointsValue", "+{points} points"), {
                  points: String(pointValues[event]),
                })}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="wizard-points-closing">
        {t(
          "dashboard.pointsSystem.closingParagraph",
          "The more you meet these conditions, the more points you earn—helping you reach higher levels until you reach level 10.",
        )}
      </p>

      <section className="wizard-levels-ladder" aria-labelledby="points-levels-heading">
        <h4 id="points-levels-heading" className="wizard-levels-ladder-title">
          {t("dashboard.pointsSystem.pyramidTitle", "Level pyramid")}
        </h4>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          {interpolate(t("dashboard.pointsSystem.xpPerLevelNote", "Each level requires {xp} additional points."), {
            xp: String(XP_PER_LEVEL),
          })}
        </p>
        <PointsLevelPyramid currentLevel={currentLevel} maxLevel={maxLevel} />
      </section>
    </div>
  );
}
