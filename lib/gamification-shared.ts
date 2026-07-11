import type { Locale } from "@/lib/i18n/types";

export const MAX_LEVEL = 10;
export const XP_PER_LEVEL = 10;

export const POINT_EVENT = {
  LESSON_COMPLETE: "LESSON_COMPLETE",
  QUIZ_PASS: "QUIZ_PASS",
  CHALLENGE_COMPLETE: "CHALLENGE_COMPLETE",
  REFERRAL_APPROVED: "REFERRAL_APPROVED",
} as const;

export type PointEventType = (typeof POINT_EVENT)[keyof typeof POINT_EVENT];

export const POINT_VALUES: Record<PointEventType, number> = {
  LESSON_COMPLETE: 5,
  QUIZ_PASS: 5,
  CHALLENGE_COMPLETE: 5,
  REFERRAL_APPROVED: 3,
};

export const QUIZ_PASS_THRESHOLD = 0.6;

export type GamificationAward = {
  eventType: PointEventType;
  points: number;
  messageKey: string;
};

export type GamificationResult = {
  pointsAwarded: number;
  awards: GamificationAward[];
  totalXp: number;
  level: number;
  previousLevel: number;
  levelUp: boolean;
  courseComplete?: boolean;
  alreadyCompleted?: boolean;
};

export function calculateLevel(experiencePoints: number): number {
  if (experiencePoints <= 0) return 1;
  const level = Math.floor(experiencePoints / XP_PER_LEVEL) + 1;
  return Math.min(MAX_LEVEL, level);
}

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) * XP_PER_LEVEL;
}

export function xpProgressToNextLevel(experiencePoints: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  maxLevel: boolean;
} {
  const level = calculateLevel(experiencePoints);
  const currentLevelXp = xpRequiredForLevel(level);

  if (level >= MAX_LEVEL) {
    return {
      level,
      currentLevelXp,
      nextLevelXp: xpRequiredForLevel(MAX_LEVEL + 1),
      progressPercent: 100,
      maxLevel: true,
    };
  }

  const nextLevelXp = xpRequiredForLevel(level + 1);
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const intoLevel = experiencePoints - currentLevelXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((intoLevel / span) * 100)));
  return { level, currentLevelXp, nextLevelXp, progressPercent, maxLevel: false };
}

const LEVEL_TITLES: Array<{ key: string; ar: string; en: string }> = [
  { key: "levelTitle1", ar: "مبتدئ السحر", en: "Magic Novice" },
  { key: "levelTitle2", ar: "طالب التعاويذ", en: "Spell Student" },
  { key: "levelTitle3", ar: "متدرب الحاوي", en: "Hawi Apprentice" },
  { key: "levelTitle4", ar: "ساحر صغير", en: "Junior Sorcerer" },
  { key: "levelTitle5", ar: "متدرب التعاويذ", en: "Spell Apprentice" },
  { key: "levelTitle6", ar: "ساحر المعرفة", en: "Knowledge Sorcerer" },
  { key: "levelTitle7", ar: "حارس الأسرار", en: "Secret Guardian" },
  { key: "levelTitle8", ar: "سيد التعاويذ", en: "Spell Master" },
  { key: "levelTitle9", ar: "حكيم الحاوي", en: "Hawi Sage" },
  { key: "levelTitle10", ar: "حاوي الأسرار", en: "Keeper of Secrets" },
];

export function getLevelTitle(level: number, locale: Locale): string {
  const idx = Math.min(MAX_LEVEL, Math.max(1, level)) - 1;
  const entry = LEVEL_TITLES[idx] ?? LEVEL_TITLES[0];
  return locale === "ar" ? entry.ar : entry.en;
}

export function getLevelTitleKey(level: number): string {
  const idx = Math.min(MAX_LEVEL, Math.max(1, level)) - 1;
  return LEVEL_TITLES[idx]?.key ?? "levelTitle1";
}

export function normalizeChallengeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isChallengeAnswerCorrect(
  questionType: "MULTIPLE_CHOICE" | "TEXT",
  submitted: string,
  correctAnswer: string,
): boolean {
  const normalizedSubmitted = normalizeChallengeAnswer(submitted);
  const normalizedCorrect = normalizeChallengeAnswer(correctAnswer);
  if (questionType === "MULTIPLE_CHOICE") {
    return normalizedSubmitted === normalizedCorrect;
  }
  return normalizedSubmitted === normalizedCorrect;
}
