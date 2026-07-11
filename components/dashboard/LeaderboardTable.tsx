"use client";

import { useT } from "@/components/LocaleProvider";
import { interpolate } from "@/lib/i18n/interpolate";
import { MAX_LEVEL } from "@/lib/gamification-shared";
import type { LeaderboardRow } from "@/components/dashboard/GlobalLeaderboardSection";

function contactPhone(row: LeaderboardRow): string | null {
  const student = row.studentNumber?.trim();
  if (student) return student;
  const guardian = row.guardianNumber?.trim();
  return guardian || null;
}

function LeaderboardNameBlock({
  row,
  showContactPhone,
}: {
  row: LeaderboardRow;
  showContactPhone?: boolean;
}) {
  const t = useT();
  const phone = showContactPhone ? contactPhone(row) : null;

  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium text-[var(--color-foreground)]">
        {row.name}
        {phone ? (
          <>
            <span className="mx-1.5 text-[var(--color-muted)]">·</span>
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="font-normal text-[var(--color-primary-emphasis)] hover:underline"
              dir="ltr"
            >
              {phone}
            </a>
          </>
        ) : showContactPhone ? (
          <span className="ms-1.5 text-xs font-normal text-[var(--color-muted)]">
            ({t("dashboard.adminLeaderboard.noPhone", "No phone")})
          </span>
        ) : null}
      </p>
      <p className="text-xs text-[var(--color-muted)]">
        {t("wizard.level", "Level")} {row.wizardLevel}/{MAX_LEVEL}
        {row.levelTitle ? ` · ${row.levelTitle}` : ""}
      </p>
    </div>
  );
}

export function LeaderboardTable({
  entries,
  callerEntry,
  currentUserId,
  showContactPhone = false,
}: {
  entries: LeaderboardRow[];
  callerEntry: LeaderboardRow | null;
  currentUserId: string;
  showContactPhone?: boolean;
}) {
  const t = useT();

  return (
    <div className="wizard-leaderboard dashboard-wizard">
      {entries.length === 0 ? (
        <p className="p-8 text-center text-sm text-[var(--color-muted)]">
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
              <LeaderboardNameBlock row={row} showContactPhone={showContactPhone} />
              <span className="shrink-0 text-sm font-bold text-[var(--color-primary-emphasis)]">
                {row.experiencePoints} {t("wizard.points", "Magic points")}
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
            <p className="text-xs text-[var(--color-muted)]">
              {interpolate(t("wizard.rankLabel", "#{rank}"), { rank: String(callerEntry.rank) })}
            </p>
          </div>
          <span className="shrink-0 text-sm font-bold text-[var(--color-primary-emphasis)]">
            {callerEntry.experiencePoints}
          </span>
        </div>
      ) : null}
    </div>
  );
}
