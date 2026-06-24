import type { Locale } from "@/lib/i18n/types";

export const POINT_EVENT = {
  LESSON_COMPLETE: "LESSON_COMPLETE",
  QUIZ_PASS: "QUIZ_PASS",
  QUIZ_HIGH_SCORE: "QUIZ_HIGH_SCORE",
  QUIZ_PERFECT: "QUIZ_PERFECT",
  COURSE_COMPLETE: "COURSE_COMPLETE",
} as const;

export type PointEventType = (typeof POINT_EVENT)[keyof typeof POINT_EVENT];

export const POINT_VALUES = {
  LESSON_COMPLETE: 25,
  QUIZ_PASS: 40,
  QUIZ_HIGH_SCORE: 20,
  QUIZ_PERFECT: 30,
  COURSE_COMPLETE: 150,
} as const;

export const QUIZ_PASS_THRESHOLD = 0.6;
export const QUIZ_HIGH_SCORE_THRESHOLD = 0.9;

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
  return Math.floor(Math.sqrt(experiencePoints / 50)) + 1;
}

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) ** 2;
}

export function xpProgressToNextLevel(experiencePoints: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  const level = calculateLevel(experiencePoints);
  const currentLevelXp = xpRequiredForLevel(level);
  const nextLevelXp = xpRequiredForLevel(level + 1);
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const intoLevel = experiencePoints - currentLevelXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((intoLevel / span) * 100)));
  return { level, currentLevelXp, nextLevelXp, progressPercent };
}

const LEVEL_TITLE_THRESHOLDS: Array<{ min: number; key: string; ar: string; en: string }> = [
  { min: 20, key: "levelTitle20", ar: "حاوي الأسرار", en: "Keeper of Secrets" },
  { min: 15, key: "levelTitle15", ar: "سيد التعاويذ", en: "Spell Master" },
  { min: 10, key: "levelTitle10", ar: "ساحر المعرفة", en: "Knowledge Sorcerer" },
  { min: 5, key: "levelTitle5", ar: "متدرب التعاويذ", en: "Spell Apprentice" },
  { min: 1, key: "levelTitle1", ar: "مبتدئ السحر", en: "Magic Novice" },
];

export function getLevelTitle(level: number, locale: Locale): string {
  const entry = LEVEL_TITLE_THRESHOLDS.find((t) => level >= t.min) ?? LEVEL_TITLE_THRESHOLDS.at(-1)!;
  return locale === "ar" ? entry.ar : entry.en;
}

export function getLevelTitleKey(level: number): string {
  const entry = LEVEL_TITLE_THRESHOLDS.find((t) => level >= t.min) ?? LEVEL_TITLE_THRESHOLDS.at(-1)!;
  return entry.key;
}
