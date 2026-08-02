import { Prisma } from "@prisma/client";
import { prisma, generateId, toNum } from "./client";
import { calculateLevel, POINT_VALUES, QUIZ_PASS_THRESHOLD } from "../gamification-shared";

/**
 * Kept for backwards compatibility with call sites that still invoke it —
 * the gamification schema is now fully managed by Prisma migrations, so
 * this is a no-op.
 */
export async function ensureGamificationSchema(): Promise<void> {
  /* no-op: schema is managed via Prisma migrations */
}

export async function getUserGamificationRow(userId: string): Promise<{
  experiencePoints: number;
  wizardLevel: number;
  name: string;
} | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, experience_points: true },
  });
  if (!user) return null;
  const experiencePoints = toNum(user.experience_points);
  return {
    name: user.name ?? "",
    experiencePoints,
    wizardLevel: calculateLevel(experiencePoints),
  };
}

export async function tryInsertPointEvent(data: {
  userId: string;
  eventType: string;
  referenceId: string;
  courseId?: string | null;
  points: number;
  metadata?: Record<string, unknown> | null;
}): Promise<boolean> {
  try {
    await prisma.pointEvent.create({
      data: {
        id: generateId(),
        user_id: data.userId,
        event_type: data.eventType,
        reference_id: data.referenceId,
        course_id: data.courseId ?? null,
        points: data.points,
        metadata: data.metadata != null ? (data.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function addUserExperiencePoints(userId: string, points: number, newLevel: number): Promise<void> {
  if (points <= 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      experience_points: { increment: points },
      wizard_level: newLevel,
      updated_at: new Date(),
    },
  });
}

export async function insertLessonCompletionIfNotExists(
  userId: string,
  lessonId: string,
  courseId: string,
): Promise<boolean> {
  try {
    await prisma.lessonCompletion.create({
      data: { id: generateId(), user_id: userId, lesson_id: lessonId, course_id: courseId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function hasLessonCompletion(userId: string, lessonId: string): Promise<boolean> {
  const count = await prisma.lessonCompletion.count({ where: { user_id: userId, lesson_id: lessonId } });
  return count > 0;
}

export async function insertCourseCompletionIfNotExists(
  userId: string,
  courseId: string,
): Promise<boolean> {
  try {
    await prisma.courseCompletion.create({
      data: { id: generateId(), user_id: userId, course_id: courseId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function hasCourseCompletion(userId: string, courseId: string): Promise<boolean> {
  const count = await prisma.courseCompletion.count({ where: { user_id: userId, course_id: courseId } });
  return count > 0;
}

export async function getCompletedLessonIdsForCourse(userId: string, courseId: string): Promise<string[]> {
  const rows = await prisma.lessonCompletion.findMany({
    where: { user_id: userId, course_id: courseId },
    select: { lesson_id: true },
  });
  return rows.map((r) => r.lesson_id);
}

export async function insertQuizPassIfNotExists(
  userId: string,
  quizId: string,
  courseId: string,
): Promise<boolean> {
  try {
    await prisma.quizCompletion.create({
      data: { id: generateId(), user_id: userId, quiz_id: quizId, course_id: courseId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getPassedQuizIdsForCourse(userId: string, courseId: string): Promise<string[]> {
  const [completions, attempts] = await Promise.all([
    prisma.quizCompletion.findMany({
      where: { user_id: userId, course_id: courseId },
      select: { quiz_id: true },
    }),
    prisma.quizAttempt.findMany({
      where: { user_id: userId, Quiz: { course_id: courseId }, total_questions: { gt: 0 } },
      select: { quiz_id: true, score: true, total_questions: true },
    }),
  ]);

  const ids = new Set<string>();
  const completedQuizIds = new Set(completions.map((c) => c.quiz_id));
  for (const id of completedQuizIds) ids.add(id);

  const passedAttemptQuizIds = new Set<string>();
  for (const a of attempts) {
    if (a.total_questions > 0 && a.score / a.total_questions >= QUIZ_PASS_THRESHOLD) {
      ids.add(a.quiz_id);
      passedAttemptQuizIds.add(a.quiz_id);
    }
  }

  // Backfill QuizCompletion rows for passed attempts not already recorded (best-effort)
  const toBackfill = [...passedAttemptQuizIds].filter((qid) => !completedQuizIds.has(qid));
  if (toBackfill.length > 0) {
    try {
      await prisma.quizCompletion.createMany({
        data: toBackfill.map((quizId) => ({ id: generateId(), user_id: userId, quiz_id: quizId, course_id: courseId })),
        skipDuplicates: true,
      });
    } catch {
      // non-fatal — progress percent still uses the in-memory id set
    }
  }

  return [...ids];
}

/**
 * نسب إنجاز عدة كورسات لطالب واحد بعدد ثابت من الاستعلامات (بدل N×getCourseProgress).
 */
export async function getCourseProgressPercentsForUser(
  userId: string,
  courseIds: string[],
): Promise<Record<string, number>> {
  const uniq = [...new Set(courseIds.map((id) => String(id).trim()).filter(Boolean))];
  const out: Record<string, number> = {};
  if (uniq.length === 0) return out;
  for (const id of uniq) out[id] = 0;

  const [lessonTotals, quizTotals, completedLessons, completionQuizRows, attemptRows] = await Promise.all([
    prisma.lesson.groupBy({ by: ["course_id"], where: { course_id: { in: uniq } }, _count: { _all: true } }),
    prisma.quiz.groupBy({ by: ["course_id"], where: { course_id: { in: uniq } }, _count: { _all: true } }),
    prisma.lessonCompletion.groupBy({
      by: ["course_id"],
      where: { user_id: userId, course_id: { in: uniq } },
      _count: { _all: true },
    }),
    prisma.quizCompletion.findMany({
      where: { user_id: userId, course_id: { in: uniq } },
      select: { course_id: true, quiz_id: true },
    }),
    prisma.quizAttempt.findMany({
      where: {
        user_id: userId,
        Quiz: { course_id: { in: uniq } },
        total_questions: { gt: 0 },
      },
      select: { quiz_id: true, score: true, total_questions: true, Quiz: { select: { course_id: true } } },
    }),
  ]);

  const lessonsTotalBy = new Map(lessonTotals.map((r) => [r.course_id, r._count._all]));
  const quizzesTotalBy = new Map(quizTotals.map((r) => [r.course_id, r._count._all]));
  const lessonsDoneBy = new Map(completedLessons.map((r) => [r.course_id, r._count._all]));

  const passedByCourse = new Map<string, Set<string>>();
  for (const row of completionQuizRows) {
    const set = passedByCourse.get(row.course_id) ?? new Set<string>();
    set.add(row.quiz_id);
    passedByCourse.set(row.course_id, set);
  }
  for (const row of attemptRows) {
    if (row.total_questions > 0 && row.score / row.total_questions >= QUIZ_PASS_THRESHOLD) {
      const cid = row.Quiz.course_id;
      const set = passedByCourse.get(cid) ?? new Set<string>();
      set.add(row.quiz_id);
      passedByCourse.set(cid, set);
    }
  }

  for (const courseId of uniq) {
    const lessonsTotal = lessonsTotalBy.get(courseId) ?? 0;
    const quizzesTotal = quizzesTotalBy.get(courseId) ?? 0;
    const lessonsDone = lessonsDoneBy.get(courseId) ?? 0;
    const quizzesPassed = passedByCourse.get(courseId)?.size ?? 0;
    const totalUnits = lessonsTotal + quizzesTotal;
    const doneUnits = lessonsDone + quizzesPassed;
    out[courseId] = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0;
  }
  return out;
}

export async function getQuizzesByCourseId(courseId: string): Promise<Array<{ id: string }>> {
  return prisma.quiz.findMany({ where: { course_id: courseId }, select: { id: true } });
}

export type LeaderboardEntry = {
  userId: string;
  name: string;
  experiencePoints: number;
  wizardLevel: number;
  rank: number;
  studentNumber?: string | null;
  guardianNumber?: string | null;
};

export async function getGlobalLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
  const rows = await prisma.user.findMany({
    where: { role: "STUDENT", experience_points: { gt: 0 } },
    orderBy: [{ experience_points: "desc" }, { name: "asc" }],
    take: limit,
    select: { id: true, name: true, experience_points: true, student_number: true, guardian_number: true },
  });
  return rows.map((r, i) => {
    const experiencePoints = toNum(r.experience_points);
    return {
      userId: r.id,
      name: r.name ?? "",
      experiencePoints,
      wizardLevel: calculateLevel(experiencePoints),
      rank: i + 1,
      studentNumber: r.student_number ?? null,
      guardianNumber: r.guardian_number ?? null,
    };
  });
}

export async function getCourseLeaderboard(courseId: string, limit: number): Promise<LeaderboardEntry[]> {
  const grouped = await prisma.pointEvent.groupBy({
    by: ["user_id"],
    where: { course_id: courseId, User: { role: "STUDENT" } },
    _sum: { points: true },
    having: { points: { _sum: { gt: 0 } } },
    orderBy: { _sum: { points: "desc" } },
    take: limit,
  });
  if (grouped.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.user_id) } },
    select: { id: true, name: true, experience_points: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return grouped
    .map((g) => {
      const u = userMap.get(g.user_id);
      return {
        userId: g.user_id,
        name: u?.name ?? "",
        experiencePoints: g._sum.points ?? 0,
        wizardLevel: calculateLevel(u ? toNum(u.experience_points) : 0),
      };
    })
    .sort((a, b) => b.experiencePoints - a.experiencePoints || a.name.localeCompare(b.name))
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export async function getGlobalStudentRank(userId: string): Promise<number | null> {
  const rows = await prisma.$queryRaw<Array<{ rnk: bigint | number }>>`
    WITH ranked AS (
      SELECT id, RANK() OVER (ORDER BY experience_points DESC, name ASC) AS rnk
      FROM "User"
      WHERE role = 'STUDENT'
    )
    SELECT rnk FROM ranked WHERE id = ${userId} LIMIT 1
  `;
  const r = rows[0];
  return r?.rnk != null ? Number(r.rnk) : null;
}

export async function getCourseStudentRank(userId: string, courseId: string): Promise<number | null> {
  const rows = await prisma.$queryRaw<Array<{ rnk: bigint | number }>>`
    WITH sums AS (
      SELECT u.id, COALESCE(SUM(pe.points), 0)::int AS course_xp
      FROM "User" u
      LEFT JOIN "PointEvent" pe ON pe.user_id = u.id AND pe.course_id = ${courseId}
      WHERE u.role = 'STUDENT'
      GROUP BY u.id
    ),
    ranked AS (
      SELECT id, RANK() OVER (ORDER BY course_xp DESC) AS rnk FROM sums WHERE course_xp > 0
    )
    SELECT rnk FROM ranked WHERE id = ${userId} LIMIT 1
  `;
  const r = rows[0];
  return r?.rnk != null ? Number(r.rnk) : null;
}

export async function getCourseXpForUser(userId: string, courseId: string): Promise<number> {
  const agg = await prisma.pointEvent.aggregate({
    where: { user_id: userId, course_id: courseId },
    _sum: { points: true },
  });
  return agg._sum.points ?? 0;
}

export async function countGlobalLeaderboardStudents(): Promise<number> {
  return prisma.user.count({ where: { role: "STUDENT", experience_points: { gt: 0 } } });
}

const GAMIFICATION_POINT_DEFAULTS: Record<string, number> = { ...POINT_VALUES };

async function ensureGamificationPointRuleSeeds(): Promise<void> {
  await prisma.gamificationPointRule.createMany({
    data: Object.entries(GAMIFICATION_POINT_DEFAULTS).map(([event_type, points]) => ({ event_type, points })),
    skipDuplicates: true,
  });
}

async function seedGamificationPointRulesIfEmpty(): Promise<void> {
  await ensureGamificationPointRuleSeeds();
}

export async function getGamificationPointRules(): Promise<Record<string, number>> {
  await seedGamificationPointRulesIfEmpty();
  const rows = await prisma.gamificationPointRule.findMany();
  const rules: Record<string, number> = { ...GAMIFICATION_POINT_DEFAULTS };
  for (const row of rows) {
    const pts = toNum(row.points);
    if (Number.isFinite(pts) && pts >= 0) rules[row.event_type] = Math.round(pts);
  }
  return rules;
}

export async function updateGamificationPointRules(
  updates: Partial<Record<string, number>>,
): Promise<Record<string, number>> {
  await seedGamificationPointRulesIfEmpty();
  for (const [eventType, points] of Object.entries(updates)) {
    if (!(eventType in GAMIFICATION_POINT_DEFAULTS)) continue;
    const pts = Number(points);
    if (!Number.isFinite(pts) || pts < 0 || pts > 10_000) {
      throw new Error(`INVALID_POINTS:${eventType}`);
    }
    await prisma.gamificationPointRule.upsert({
      where: { event_type: eventType },
      update: { points: Math.round(pts), updated_at: new Date() },
      create: { event_type: eventType, points: Math.round(pts), updated_at: new Date() },
    });
  }
  return getGamificationPointRules();
}

export async function recalculateAllWizardLevels(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, experience_points: true },
  });
  let updated = 0;
  for (const u of users) {
    const level = calculateLevel(toNum(u.experience_points));
    await prisma.user.update({ where: { id: u.id }, data: { wizard_level: level, updated_at: new Date() } });
    updated += 1;
  }
  return updated;
}
