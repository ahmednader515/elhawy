"use client";

import Link from "next/link";
import { useT } from "@/components/LocaleProvider";

export type LeaderboardRow = {
  userId: string;
  name: string;
  experiencePoints: number;
  wizardLevel: number;
  rank: number;
  levelTitle?: string;
  studentNumber?: string | null;
  guardianNumber?: string | null;
};

export function GlobalLeaderboardSection({
  entries,
  callerEntry,
  currentUserId,
}: {
  entries: LeaderboardRow[];
  callerEntry: LeaderboardRow | null;
  currentUserId: string;
}) {
  const t = useT();

  return (
    <section className="wizard-leaderboard dashboard-wizard">
      <div className="wizard-leaderboard-header">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
          {t("wizard.leaderboardTitle", "Hall of Fame")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t("wizard.leaderboardSubtitle", "Top wizards on the platform")}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="p-6 text-center text-sm text-[var(--color-muted)]">
          {t("wizard.noRankYet", "No rank yet — start learning spells")}
        </p>
      ) : (
        <ul>
          {entries.map((row) => (
            <li
              key={row.userId}
              className={`wizard-leaderboard-row ${row.userId === currentUserId ? "is-me" : ""}`}
            >
              <span className="wizard-rank">{row.rank}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[var(--color-foreground)]">{row.name}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {t("wizard.level", "Level")} {row.wizardLevel}
                  {row.levelTitle ? ` · ${row.levelTitle}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold text-[var(--color-primary-emphasis)]">
                {row.experiencePoints}
              </span>
            </li>
          ))}
        </ul>
      )}

      {callerEntry && !entries.some((e) => e.userId === callerEntry.userId) ? (
        <div className="wizard-leaderboard-row is-me border-t border-[var(--color-border)]">
          <span className="wizard-rank">{callerEntry.rank}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{callerEntry.name}</p>
            <p className="text-xs text-[var(--color-muted)]">{t("wizard.yourRank", "Your rank")}</p>
          </div>
          <span className="shrink-0 text-sm font-bold text-[var(--color-primary-emphasis)]">
            {callerEntry.experiencePoints}
          </span>
        </div>
      ) : null}

      <div className="border-t border-[var(--color-border)] p-3 text-center">
        <Link
          href="/dashboard/leaderboard"
          className="text-sm font-medium text-[var(--color-primary-emphasis)] hover:underline"
        >
          {t("wizard.viewFullLeaderboard", "View full leaderboard")}
        </Link>
      </div>
    </section>
  );
}
