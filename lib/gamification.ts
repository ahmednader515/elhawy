import type { Locale } from "@/lib/i18n/types";
import {
  addUserExperiencePoints,
  getCompletedLessonIdsForCourse,
  getCourseLeaderboard,
  getCourseStudentRank,
  getCourseXpForUser,
  getGlobalLeaderboard,
  getGlobalStudentRank,
  getLessonsByCourseId,
  getPassedQuizIdsForCourse,
  getQuizzesByCourseId,
  getUserGamificationRow,
  hasCourseCompletion,
  hasLessonCompletion,
  insertCourseCompletionIfNotExists,
  insertLessonCompletionIfNotExists,
  tryInsertPointEvent,
  type LeaderboardEntry,
} from "@/lib/db";
import {
  POINT_EVENT,
  QUIZ_HIGH_SCORE_THRESHOLD,
  QUIZ_PASS_THRESHOLD,
  calculateLevel,
  getLevelTitle,
  getLevelTitleKey,
  xpProgressToNextLevel,
  type GamificationAward,
  type GamificationResult,
  type PointEventType,
} from "@/lib/gamification-shared";
import { getGamificationPointValues, type GamificationPointValues } from "@/lib/gamification-point-settings";

export {
  POINT_EVENT,
  QUIZ_PASS_THRESHOLD,
  QUIZ_HIGH_SCORE_THRESHOLD,
  calculateLevel,
  getLevelTitle,
  getLevelTitleKey,
  xpProgressToNextLevel,
  type GamificationAward,
  type GamificationResult,
  type PointEventType,
};

async function awardPoints(params: {
  userId: string;
  eventType: PointEventType;
  referenceId: string;
  courseId?: string | null;
  points: number;
  messageKey: string;
  metadata?: Record<string, unknown>;
}): Promise<GamificationAward | null> {
  const inserted = await tryInsertPointEvent({
    userId: params.userId,
    eventType: params.eventType,
    referenceId: params.referenceId,
    courseId: params.courseId,
    points: params.points,
    metadata: params.metadata,
  });
  if (!inserted) return null;
  return {
    eventType: params.eventType,
    points: params.points,
    messageKey: params.messageKey,
  };
}

async function finalizeAwards(
  userId: string,
  awards: GamificationAward[],
): Promise<Pick<GamificationResult, "pointsAwarded" | "totalXp" | "level" | "previousLevel" | "levelUp">> {
  const pointsAwarded = awards.reduce((sum, a) => sum + a.points, 0);
  const before = await getUserGamificationRow(userId);
  const previousLevel = before?.wizardLevel ?? calculateLevel(before?.experiencePoints ?? 0);
  const previousXp = before?.experiencePoints ?? 0;
  const totalXp = previousXp + pointsAwarded;
  const level = calculateLevel(totalXp);

  if (pointsAwarded > 0) {
    await addUserExperiencePoints(userId, pointsAwarded, level);
  }

  return {
    pointsAwarded,
    totalXp,
    level,
    previousLevel,
    levelUp: level > previousLevel,
  };
}

export async function markLessonComplete(
  userId: string,
  lessonId: string,
  courseId: string,
): Promise<GamificationResult> {
  const already = await hasLessonCompletion(userId, lessonId);
  if (already) {
    const row = await getUserGamificationRow(userId);
    const xp = row?.experiencePoints ?? 0;
    const level = row?.wizardLevel ?? calculateLevel(xp);
    return {
      pointsAwarded: 0,
      awards: [],
      totalXp: xp,
      level,
      previousLevel: level,
      levelUp: false,
      alreadyCompleted: true,
    };
  }

  const inserted = await insertLessonCompletionIfNotExists(userId, lessonId, courseId);
  if (!inserted) {
    const row = await getUserGamificationRow(userId);
    const xp = row?.experiencePoints ?? 0;
    const level = row?.wizardLevel ?? calculateLevel(xp);
    return {
      pointsAwarded: 0,
      awards: [],
      totalXp: xp,
      level,
      previousLevel: level,
      levelUp: false,
      alreadyCompleted: true,
    };
  }

  const pointValues = await getGamificationPointValues();
  const awards: GamificationAward[] = [];
  const lessonAward = await awardPoints({
    userId,
    eventType: POINT_EVENT.LESSON_COMPLETE,
    referenceId: lessonId,
    courseId,
    points: pointValues.LESSON_COMPLETE,
    messageKey: "wizard.lessonComplete",
  });
  if (lessonAward) awards.push(lessonAward);

  const courseResult = await maybeAwardCourseComplete(userId, courseId, pointValues);
  if (courseResult.award) awards.push(courseResult.award);

  const finalized = await finalizeAwards(userId, awards);
  return {
    ...finalized,
    awards,
    courseComplete: courseResult.completed,
  };
}

async function maybeAwardCourseComplete(
  userId: string,
  courseId: string,
  pointValues: GamificationPointValues,
): Promise<{ completed: boolean; award: GamificationAward | null }> {
  if (await hasCourseCompletion(userId, courseId)) {
    return { completed: false, award: null };
  }

  const [lessons, quizzes, completedLessonIds, passedQuizIds] = await Promise.all([
    getLessonsByCourseId(courseId),
    getQuizzesByCourseId(courseId),
    getCompletedLessonIdsForCourse(userId, courseId),
    getPassedQuizIdsForCourse(userId, courseId),
  ]);

  const lessonsTotal = lessons.length;
  const quizzesTotal = quizzes.length;
  const lessonsDone = completedLessonIds.length;
  const quizzesPassed = passedQuizIds.length;

  const lessonsOk = lessonsTotal === 0 || lessonsDone >= lessonsTotal;
  const quizzesOk = quizzesTotal === 0 || quizzesPassed >= quizzesTotal;

  if (!lessonsOk || !quizzesOk) {
    return { completed: false, award: null };
  }

  const inserted = await insertCourseCompletionIfNotExists(userId, courseId);
  if (!inserted) return { completed: false, award: null };

  const award = await awardPoints({
    userId,
    eventType: POINT_EVENT.COURSE_COMPLETE,
    referenceId: courseId,
    courseId,
    points: pointValues.COURSE_COMPLETE,
    messageKey: "wizard.courseComplete",
  });

  return { completed: true, award };
}

export async function awardQuizPoints(
  userId: string,
  quizId: string,
  courseId: string,
  score: number,
  totalScored: number,
): Promise<GamificationResult> {
  const pointValues = await getGamificationPointValues();
  const awards: GamificationAward[] = [];
  if (totalScored > 0) {
    const pct = score / totalScored;
    if (pct >= QUIZ_PASS_THRESHOLD) {
      const pass = await awardPoints({
        userId,
        eventType: POINT_EVENT.QUIZ_PASS,
        referenceId: quizId,
        courseId,
        points: pointValues.QUIZ_PASS,
        messageKey: "wizard.quizPass",
        metadata: { score, totalScored, pct },
      });
      if (pass) awards.push(pass);
    }
    if (pct >= QUIZ_HIGH_SCORE_THRESHOLD) {
      const high = await awardPoints({
        userId,
        eventType: POINT_EVENT.QUIZ_HIGH_SCORE,
        referenceId: quizId,
        courseId,
        points: pointValues.QUIZ_HIGH_SCORE,
        messageKey: "wizard.quizHighScore",
        metadata: { score, totalScored, pct },
      });
      if (high) awards.push(high);
    }
    if (pct >= 1) {
      const perfect = await awardPoints({
        userId,
        eventType: POINT_EVENT.QUIZ_PERFECT,
        referenceId: quizId,
        courseId,
        points: pointValues.QUIZ_PERFECT,
        messageKey: "wizard.quizPerfect",
        metadata: { score, totalScored, pct },
      });
      if (perfect) awards.push(perfect);
    }
  }

  const courseResult = await maybeAwardCourseComplete(userId, courseId, pointValues);
  if (courseResult.award) awards.push(courseResult.award);

  const finalized = await finalizeAwards(userId, awards);
  return {
    ...finalized,
    awards,
    courseComplete: courseResult.completed,
  };
}

export async function getCourseProgress(userId: string, courseId: string): Promise<{
  lessonsDone: number;
  lessonsTotal: number;
  quizzesPassed: number;
  quizzesTotal: number;
  percent: number;
  completedLessonIds: string[];
  passedQuizIds: string[];
  courseCompleted: boolean;
}> {
  const [lessons, quizzes, completedLessonIds, passedQuizIds, courseCompleted] = await Promise.all([
    getLessonsByCourseId(courseId),
    getQuizzesByCourseId(courseId),
    getCompletedLessonIdsForCourse(userId, courseId),
    getPassedQuizIdsForCourse(userId, courseId),
    hasCourseCompletion(userId, courseId),
  ]);

  const lessonsTotal = lessons.length;
  const quizzesTotal = quizzes.length;
  const lessonsDone = completedLessonIds.length;
  const quizzesPassed = passedQuizIds.length;
  const totalUnits = lessonsTotal + quizzesTotal;
  const doneUnits = lessonsDone + quizzesPassed;
  const percent = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0;

  return {
    lessonsDone,
    lessonsTotal,
    quizzesPassed,
    quizzesTotal,
    percent,
    completedLessonIds,
    passedQuizIds,
    courseCompleted,
  };
}

export async function getStudentGamificationProfile(userId: string, locale: Locale) {
  const row = await getUserGamificationRow(userId);
  const xp = row?.experiencePoints ?? 0;
  const level = row?.wizardLevel ?? calculateLevel(xp);
  const progress = xpProgressToNextLevel(xp);
  const globalRank = await getGlobalStudentRank(userId);

  return {
    xp,
    levelTitle: getLevelTitle(level, locale),
    levelTitleKey: getLevelTitleKey(level),
    ...progress,
    globalRank,
    name: row?.name ?? "",
  };
}

export async function getLeaderboard(params: {
  scope: "global" | "course";
  courseId?: string;
  limit?: number;
  userId?: string;
  locale?: Locale;
}): Promise<{
  entries: Array<LeaderboardEntry & { levelTitle?: string }>;
  callerRank: number | null;
  callerEntry: (LeaderboardEntry & { levelTitle?: string }) | null;
}> {
  const limit = params.limit ?? 20;
  const locale = params.locale ?? "ar";
  const entriesRaw =
    params.scope === "course" && params.courseId
      ? await getCourseLeaderboard(params.courseId, limit)
      : await getGlobalLeaderboard(limit);

  const entries = entriesRaw.map((e) => ({
    ...e,
    levelTitle: getLevelTitle(e.wizardLevel, locale),
  }));

  let callerRank: number | null = null;
  let callerEntry: (LeaderboardEntry & { levelTitle?: string }) | null = null;

  if (params.userId) {
    callerRank =
      params.scope === "course" && params.courseId
        ? await getCourseStudentRank(params.userId, params.courseId)
        : await getGlobalStudentRank(params.userId);

    const inList = entries.find((e) => e.userId === params.userId);
    if (inList) {
      callerEntry = inList;
    } else if (callerRank != null) {
      const row = await getUserGamificationRow(params.userId);
      if (row) {
        const xp =
          params.scope === "course" && params.courseId
            ? await getCourseXpForUser(params.userId, params.courseId)
            : row.experiencePoints;
        callerEntry = {
          userId: params.userId,
          name: row.name,
          experiencePoints: xp,
          wizardLevel: row.wizardLevel,
          rank: callerRank,
          levelTitle: getLevelTitle(row.wizardLevel, locale),
        };
      }
    }
  }

  return { entries, callerRank, callerEntry };
}

export { type LeaderboardEntry };
