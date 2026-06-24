"use client";

import { useT } from "@/components/LocaleProvider";
import { interpolate } from "@/lib/i18n/interpolate";
import type { LeaderboardRow } from "@/components/dashboard/GlobalLeaderboardSection";

type CourseProgress = {
  lessonsDone: number;
  lessonsTotal: number;
  quizzesPassed: number;
  quizzesTotal: number;
  percent: number;
};

export function CourseLeaderboardSection({
  progress,
  leaderboard,
  courseRank,
  currentUserId,
}: {
  progress: CourseProgress;
  leaderboard: LeaderboardRow[];
  courseRank: number | null;
  currentUserId: string;
}) {
  const t = useT();
  const totalSpells = progress.lessonsTotal + progress.quizzesTotal;
  const doneSpells = progress.lessonsDone + progress.quizzesPassed;

  return (
    <div className="dashboard-wizard space-y-4">
      <div className="wizard-course-progress">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">
          {interpolate(t("wizard.progressLabel", "{done} of {total} spells"), {
            done: String(doneSpells),
            total: String(totalSpells),
          })}
        </p>
        <div className="wizard-xp-bar mt-2" aria-hidden>
          <span className="wizard-xp-bar-fill" style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {interpolate(t("wizard.progressPercent", "{percent}% of the journey"), {
            percent: String(progress.percent),
          })}
        </p>
        {courseRank != null ? (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {t("wizard.yourRank", "Your rank")}:{" "}
            <span className="font-semibold text-[var(--color-foreground)]">
              {interpolate(t("wizard.rankLabel", "#{rank}"), { rank: String(courseRank) })}
            </span>
          </p>
        ) : null}
      </div>

      {leaderboard.length > 0 ? (
        <div className="wizard-leaderboard">
          <div className="wizard-leaderboard-header">
            <h3 className="text-base font-semibold text-[var(--color-foreground)]">
              {t("wizard.courseLeaderboardTitle", "Course champions")}
            </h3>
          </div>
          <ul>
            {leaderboard.map((row) => (
              <li
                key={row.userId}
                className={`wizard-leaderboard-row ${row.userId === currentUserId ? "is-me" : ""}`}
              >
                <span className="wizard-rank">{row.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--color-foreground)]">{row.name}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-[var(--color-primary-emphasis)]">
                  {row.experiencePoints}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
