"use client";

import Link from "next/link";
import { useT } from "@/components/LocaleProvider";
import { interpolate } from "@/lib/i18n/interpolate";
import { MAX_LEVEL } from "@/lib/gamification-shared";

type Profile = {
  xp: number;
  level: number;
  levelTitle: string;
  progressPercent: number;
  currentLevelXp: number;
  nextLevelXp: number;
  maxLevel?: boolean;
  globalRank: number | null;
};

export function StudentWizardProfileCard({ profile }: { profile: Profile }) {
  const t = useT();

  return (
    <div className="wizard-profile-card dashboard-wizard sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            {t("wizard.points", "Magic points")}
          </p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-foreground)]">{profile.xp}</p>
        </div>
        <span className="wizard-level-badge">
          {t("wizard.level", "Level")} {profile.level}/{MAX_LEVEL} · {profile.levelTitle}
        </span>
      </div>

      <div className="wizard-xp-bar" aria-hidden>
        <span className="wizard-xp-bar-fill" style={{ width: `${profile.progressPercent}%` }} />
      </div>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {profile.maxLevel
          ? t("wizard.maxLevelReached", "You reached the highest level")
          : interpolate(t("wizard.xpToNext", "{current} / {next} XP to next level"), {
              current: String(profile.xp - profile.currentLevelXp),
              next: String(profile.nextLevelXp - profile.currentLevelXp),
            })}
      </p>

      <p className="mt-3 text-sm text-[var(--color-muted)]">
        {t("wizard.yourRank", "Your rank")}:{" "}
        <span className="font-semibold text-[var(--color-foreground)]">
          {profile.globalRank != null
            ? interpolate(t("wizard.rankLabel", "#{rank}"), { rank: String(profile.globalRank) })
            : t("wizard.noRankYet", "No rank yet — start learning spells")}
        </span>
      </p>

      <Link
        href="/dashboard/leaderboard"
        className="mt-4 inline-flex text-sm font-medium text-[var(--color-primary-emphasis)] hover:underline"
      >
        {t("wizard.viewFullLeaderboard", "View full leaderboard")} →
      </Link>
    </div>
  );
}
