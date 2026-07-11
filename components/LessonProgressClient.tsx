"use client";

import { useCallback, useState } from "react";
import {
  MAX_LEVEL,
  getLevelTitleKey,
  type GamificationResult,
} from "@/lib/gamification-shared";
import { useT } from "@/components/LocaleProvider";
import { WizardToast } from "@/components/WizardToast";
import { notifyGamificationXpUpdated } from "@/lib/gamification-navbar";
import { interpolate } from "@/lib/i18n/interpolate";

function levelTitleKey(level: number): string {
  return getLevelTitleKey(level);
}

export function buildGamificationToast(
  result: GamificationResult,
  t: (key: string, fallback?: string) => string,
): { message: string; subMessage?: string } {
  const primary = result.awards[result.awards.length - 1] ?? result.awards[0];
  const message = primary
    ? t(primary.messageKey, primary.messageKey)
    : result.alreadyCompleted
      ? t("wizard.lessonAlreadyComplete", "You already mastered this spell")
      : t("wizard.lessonComplete", "You learned a new spell");

  const parts: string[] = [];
  if (result.pointsAwarded > 0) {
    parts.push(`+${result.pointsAwarded} ${t("wizard.points", "Magic points")}`);
  }
  if (result.levelUp) {
    parts.push(
      interpolate(t("wizard.levelUp", "You reached level {level}: {title}"), {
        level: String(result.level),
        title: t(`wizard.${levelTitleKey(result.level)}`, ""),
      }),
    );
  }
  if (result.courseComplete) {
    parts.push(t("wizard.courseComplete", "You completed the knowledge journey"));
  }

  return {
    message,
    subMessage: parts.length > 0 ? parts.join(" · ") : undefined,
  };
}

export function useLessonComplete(lessonId: string, isStudent: boolean, initialCompleted: boolean) {
  const t = useT();
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; subMessage?: string } | null>(null);

  const completeLesson = useCallback(async () => {
    if (!isStudent || completed || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/progress/lessons/${encodeURIComponent(lessonId)}/complete`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? t("common.pleaseWait", "Please wait..."));
        return;
      }
      setCompleted(true);
      const gamification = data.gamification as GamificationResult | undefined;
      if (gamification && typeof gamification.totalXp === "number") {
        notifyGamificationXpUpdated(gamification.totalXp);
      }
      if (gamification && (gamification.pointsAwarded > 0 || gamification.levelUp || gamification.courseComplete)) {
        setToast(buildGamificationToast(gamification, t));
      } else if (!gamification?.alreadyCompleted) {
        setToast({ message: t("wizard.lessonComplete", "You learned a new spell") });
      }
    } catch {
      alert(t("quiz.serverConnectionFailed", "Failed to connect to server"));
    } finally {
      setLoading(false);
    }
  }, [completed, isStudent, lessonId, loading, t]);

  return { completed, loading, toast, setToast, completeLesson };
}

export function LessonCompleteButton({
  lessonId,
  isStudent,
  initialCompleted,
}: {
  lessonId: string;
  isStudent: boolean;
  initialCompleted: boolean;
}) {
  const t = useT();
  const { completed, loading, toast, setToast, completeLesson } = useLessonComplete(
    lessonId,
    isStudent,
    initialCompleted,
  );

  if (!isStudent) return null;

  return (
    <>
      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={completeLesson}
          disabled={completed || loading}
          className="wizard-complete-btn"
        >
          {completed
            ? t("wizard.lessonCompleteDone", "Spell mastered ✦")
            : loading
              ? t("common.pleaseWait", "Please wait...")
              : t("wizard.lessonCompleteButton", "I completed the spell")}
        </button>
      </div>
      {toast ? (
        <WizardToast
          message={toast.message}
          subMessage={toast.subMessage}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
