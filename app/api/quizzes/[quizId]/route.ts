import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getQuizById,
  getEnrollment,
  getAllowedQuizIdsForUserCourse,
  countQuizAttemptsByUserAndCourse,
  createQuizAttempt,
  updateQuizAttemptById,
  getInProgressQuizAttemptId,
  insertQuizPassIfNotExists,
  hasFullCourseAccessAsStudent,
} from "@/lib/db";
import { computeQuizScore, normalizeQuizSubmitTotals } from "@/lib/quiz-scoring";

/**
 * جلب اختبار بالمعرّف — مع التحقق من حد المحاولات إن وُجد.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    if (!quizId || quizId.length < 20) {
      return NextResponse.json({ error: "معرّف الاختبار غير صالح" }, { status: 400 });
    }

    const result = await getQuizById(quizId);

    if (!result || !result.course) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    const isPublished = result.course.isPublished ?? result.course.is_published;
    if (!isPublished) {
      return NextResponse.json({ error: "الدورة غير منشورة" }, { status: 404 });
    }

    const courseId = (result.quiz.courseId ?? result.quiz.course_id) as string;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    const isStaff = role === "ADMIN" || role === "ASSISTANT_ADMIN";
    if (!isStaff) {
      const enrolled = await getEnrollment(session.user.id, courseId);
      const fullCourse = await hasFullCourseAccessAsStudent(session.user.id, courseId);
      if (!enrolled && !fullCourse) {
        const allowedQuizIds = await getAllowedQuizIdsForUserCourse(session.user.id, courseId);
        if (!allowedQuizIds.includes(quizId)) {
          return NextResponse.json({ error: "غير مسجّل في هذه الدورة أو لا تملك صلاحية لهذا الاختبار" }, { status: 403 });
        }
      }
    }

    const maxAttempts = result.course.max_quiz_attempts ?? result.course.maxQuizAttempts;
    const inProgressAttemptId = session?.user?.id
      ? await getInProgressQuizAttemptId(session.user.id, quizId)
      : null;
    let canAttempt = true;
    let attemptsUsed = 0;
    if (session?.user?.id && typeof maxAttempts === "number" && maxAttempts > 0) {
      const enrolled = await getEnrollment(session.user.id, courseId);
      const fullCourse = await hasFullCourseAccessAsStudent(session.user.id, courseId);
      if (enrolled || fullCourse) {
        attemptsUsed = await countQuizAttemptsByUserAndCourse(session.user.id, courseId);
        if (attemptsUsed >= maxAttempts && !inProgressAttemptId) {
          canAttempt = false;
        }
      }
    }

    const rawLimit = result.quiz.timeLimitMinutes ?? result.quiz.time_limit_minutes;
    let timeLimitMinutes: number | null = null;
    if (rawLimit != null && rawLimit !== "") {
      const n = Math.floor(Number(rawLimit));
      if (Number.isFinite(n) && n >= 1) {
        timeLimitMinutes = Math.min(24 * 60, n);
      }
    }

    const payload = {
      id: result.quiz.id,
      title: result.quiz.title,
      courseId: result.quiz.courseId ?? result.quiz.course_id,
      order: result.quiz.order,
      timeLimitMinutes,
      course: {
        id: result.course.id,
        slug: result.course.slug,
        title: result.course.title,
        titleAr: result.course.titleAr ?? result.course.title_ar,
      },
      questions: result.questions.map((q) => ({
        id: q.id,
        type: q.type,
        questionText: q.questionText ?? q.question_text,
        order: q.order,
        options: (q.options ?? []).map((o: Record<string, unknown>) => ({
          id: o.id,
          text: o.text,
          isCorrect: Boolean(o.isCorrect ?? o.is_correct),
        })),
      })),
      maxQuizAttempts: typeof maxAttempts === "number" ? maxAttempts : null,
      attemptsUsed,
      canAttempt,
      inProgressAttemptId,
    };

    if (!canAttempt) {
      return NextResponse.json(
        { error: "تم استنفاد عدد المحاولات المسموح بها لهذا الاختبار في الكورس.", ...payload },
        { status: 403 }
      );
    }

    return NextResponse.json(payload);
  } catch (e) {
    console.error("API quizzes [quizId]:", e);
    return NextResponse.json(
      { error: "حدث خطأ في جلب الاختبار" },
      { status: 500 }
    );
  }
}

/** تسجيل نتيجة محاولة الاختبار */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }

    const { quizId } = await params;
    if (!quizId || quizId.length < 20) {
      return NextResponse.json({ error: "معرّف الاختبار غير صالح" }, { status: 400 });
    }

    let body: {
      score?: number;
      totalQuestions?: number;
      attemptId?: string | null;
      answers?: Record<string, string>;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const result = await getQuizById(quizId);
    if (!result || !result.course) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    const courseId = (result.quiz.courseId ?? result.quiz.course_id) as string;
    const enrolled = await getEnrollment(session.user.id, courseId);
    const fullCourse = await hasFullCourseAccessAsStudent(session.user.id, courseId);
    if (!enrolled && !fullCourse) {
      return NextResponse.json({ error: "غير مسجّل في هذه الدورة" }, { status: 403 });
    }

    const answers =
      body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
        ? (body.answers as Record<string, string>)
        : {};

    const questionsForScoring = result.questions.map((q) => ({
      id: String(q.id),
      type: String(q.type ?? q.question_type ?? "MULTIPLE_CHOICE"),
      options: (q.options ?? []).map((o: Record<string, unknown>) => ({
        id: String(o.id),
        isCorrect: Boolean(o.isCorrect ?? o.is_correct),
        is_correct: Boolean(o.is_correct ?? o.isCorrect),
      })),
    }));

    const computed = computeQuizScore(questionsForScoring, answers);
    let score = computed.score;
    let totalQuestions = computed.totalScored;

    if (totalQuestions < 1) {
      score = Number(body.score ?? 0);
      totalQuestions = Number(body.totalQuestions ?? 0);
    }

    if (!Number.isFinite(score) || score < 0) {
      return NextResponse.json({ error: "النتيجة غير صالحة" }, { status: 400 });
    }
    if (!Number.isFinite(totalQuestions) || totalQuestions < 1) {
      return NextResponse.json({ error: "عدد الأسئلة غير صالح" }, { status: 400 });
    }

    const normalized = normalizeQuizSubmitTotals(questionsForScoring, score, totalQuestions);
    score = normalized.score;
    totalQuestions = normalized.totalQuestions;
    const passed = normalized.passed;

    let attemptId =
      typeof body.attemptId === "string" && body.attemptId.trim() ? body.attemptId.trim() : null;
    if (!attemptId) {
      attemptId = await getInProgressQuizAttemptId(session.user.id, quizId);
    }

    if (attemptId) {
      const ok = await updateQuizAttemptById({
        attemptId,
        userId: session.user.id,
        quizId,
        score,
        totalQuestions,
      });
      if (!ok) {
        await createQuizAttempt(session.user.id, quizId, score, totalQuestions);
      }
    } else {
      await createQuizAttempt(session.user.id, quizId, score, totalQuestions);
    }

    if (passed) {
      await insertQuizPassIfNotExists(session.user.id, quizId, courseId);
    }

    let gamification = null;
    const role = (session.user as { role?: string }).role;
    if (role === "STUDENT") {
      const { awardQuizPoints } = await import("@/lib/gamification");
      gamification = await awardQuizPoints(
        session.user.id,
        quizId,
        courseId,
        score,
        totalQuestions,
      );
    }

    return NextResponse.json({ success: true, passed, gamification });
  } catch (e) {
    console.error("API quizzes [quizId] POST:", e);
    return NextResponse.json({ error: "حدث خطأ في تسجيل النتيجة" }, { status: 500 });
  }
}
