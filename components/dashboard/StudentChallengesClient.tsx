"use client";

import { useCallback, useEffect, useState } from "react";
import { useT, useLocale } from "@/components/LocaleProvider";
import { pickLocalizedText } from "@/lib/i18n/localized-field";
import { WizardToast } from "@/components/WizardToast";
import { notifyGamificationXpUpdated } from "@/lib/gamification-navbar";
import { buildGamificationToast } from "@/components/LessonProgressClient";
import type { GamificationResult } from "@/lib/gamification-shared";

type ChallengeItem = {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  questionType: "MULTIPLE_CHOICE" | "TEXT";
  options: string[];
  submission: {
    answer: string;
    isCorrect: boolean;
    submittedAt: string;
  } | null;
};

export function StudentChallengesClient() {
  const t = useT();
  const locale = useLocale();
  const C = "dashboard.challenges";
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; subMessage?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/challenges", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setChallenges(data.challenges ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitChallenge(challengeId: string) {
    const answer = answers[challengeId]?.trim();
    if (!answer) return;
    setSubmittingId(challengeId);
    try {
      const res = await fetch(`/api/challenges/${encodeURIComponent(challengeId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? t(`${C}.submitFailed`, "Failed to submit"));
        return;
      }
      const gamification = data.gamification as GamificationResult | undefined;
      if (gamification && typeof gamification.totalXp === "number") {
        notifyGamificationXpUpdated(gamification.totalXp);
      }
      if (data.isCorrect && gamification) {
        setToast(buildGamificationToast(gamification, t));
      } else if (data.isCorrect) {
        setToast({ message: t("wizard.challengeComplete", "Challenge completed!") });
      } else {
        setToast({ message: t(`${C}.incorrect`, "Incorrect answer. Try another challenge.") });
      }
      await load();
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-muted)]">{t("common.loading", "Loading...")}</p>;
  }

  if (challenges.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted)]">
        {t(`${C}.empty`, "No active challenges right now. Check back soon.")}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {challenges.map((challenge) => {
          const title = pickLocalizedText(locale, challenge.title, challenge.titleEn);
          const description = pickLocalizedText(locale, challenge.description, challenge.descriptionEn);
          const submitted = Boolean(challenge.submission);

          return (
            <article
              key={challenge.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"
            >
              <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h3>
              {description ? (
                <p className="mt-2 text-sm text-[var(--color-muted)]">{description}</p>
              ) : null}

              {submitted ? (
                <p className="mt-4 text-sm font-medium text-[var(--color-primary)]">
                  {challenge.submission?.isCorrect
                    ? t(`${C}.alreadyCorrect`, "You completed this challenge ✦")
                    : t(`${C}.alreadySubmitted`, "You already submitted an answer")}
                </p>
              ) : challenge.questionType === "MULTIPLE_CHOICE" ? (
                <div className="mt-4 space-y-2">
                  {challenge.options.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 hover:bg-[var(--color-background)]"
                    >
                      <input
                        type="radio"
                        name={`challenge-${challenge.id}`}
                        checked={answers[challenge.id] === option}
                        onChange={() => setAnswers((prev) => ({ ...prev, [challenge.id]: option }))}
                      />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    disabled={!answers[challenge.id] || submittingId === challenge.id}
                    onClick={() => void submitChallenge(challenge.id)}
                    className="mt-2 rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                  >
                    {submittingId === challenge.id
                      ? t("common.pleaseWait", "Please wait...")
                      : t(`${C}.submit`, "Submit answer")}
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <input
                    type="text"
                    value={answers[challenge.id] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [challenge.id]: e.target.value }))}
                    className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                    placeholder={t(`${C}.textPlaceholder`, "Type your answer")}
                  />
                  <button
                    type="button"
                    disabled={!answers[challenge.id]?.trim() || submittingId === challenge.id}
                    onClick={() => void submitChallenge(challenge.id)}
                    className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                  >
                    {submittingId === challenge.id
                      ? t("common.pleaseWait", "Please wait...")
                      : t(`${C}.submit`, "Submit answer")}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {toast ? (
        <WizardToast message={toast.message} subMessage={toast.subMessage} onDismiss={() => setToast(null)} />
      ) : null}
    </>
  );
}
