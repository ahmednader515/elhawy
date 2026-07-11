"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";
import {
  GAMIFICATION_POINT_EVENT_TYPES,
  type GamificationPointValues,
} from "@/lib/gamification-point-settings";
import type { PointEventType } from "@/lib/gamification-shared";

const RULE_META: Array<{
  key: PointEventType;
  labelKey: string;
  descKey: string;
}> = [
  {
    key: "LESSON_COMPLETE",
    labelKey: "lessonComplete",
    descKey: "lessonCompleteDesc",
  },
  {
    key: "QUIZ_PASS",
    labelKey: "quizPass",
    descKey: "quizPassDesc",
  },
  {
    key: "CHALLENGE_COMPLETE",
    labelKey: "challengeComplete",
    descKey: "challengeCompleteDesc",
  },
  {
    key: "REFERRAL_APPROVED",
    labelKey: "referralApproved",
    descKey: "referralApprovedDesc",
  },
];

export function GamificationPointsForm({ initialValues }: { initialValues: GamificationPointValues }) {
  const router = useRouter();
  const t = useT();
  const Gp = "dashboard.gamificationPoints";
  const [values, setValues] = useState<GamificationPointValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload: Partial<Record<PointEventType, number>> = {};
      for (const key of GAMIFICATION_POINT_EVENT_TYPES) {
        payload[key] = Number(values[key]);
      }
      const res = await fetch("/api/dashboard/settings/gamification-points", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(`${Gp}.saveFailed`));
      if (data.values) setValues(data.values as GamificationPointValues);
      setSuccess(t(`${Gp}.saveSuccess`));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(`${Gp}.saveFailed`));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-6">
      {error ? (
        <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[var(--radius-btn)] bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      ) : null}

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-background)]/50 px-4 py-3">
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{t(`${Gp}.rulesTitle`)}</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{t(`${Gp}.rulesIntro`)}</p>
        </div>
        <ul className="divide-y divide-[var(--color-border)]">
          {RULE_META.map((rule) => (
            <li key={rule.key} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--color-foreground)]">{t(`${Gp}.${rule.labelKey}`)}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{t(`${Gp}.${rule.descKey}`)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label htmlFor={`points-${rule.key}`} className="sr-only">
                  {t(`${Gp}.${rule.labelKey}`)}
                </label>
                <input
                  id={`points-${rule.key}`}
                  type="number"
                  min={0}
                  max={10000}
                  step={1}
                  required
                  value={values[rule.key]}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [rule.key]: Number(e.target.value),
                    }))
                  }
                  className="w-24 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                />
                <span className="text-sm text-[var(--color-muted)]">{t("wizard.points", "Magic points")}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
      </button>
    </form>
  );
}
