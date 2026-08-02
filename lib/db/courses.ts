import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";
import { prisma, generateId, toNum, toStr } from "./client";
import type {
  Course,
  Category,
  Lesson,
  Quiz,
  Question,
  QuestionOption,
  Enrollment,
  ActivationCode,
  HomeworkSubmission,
  LessonRating,
  LiveStream,
  LiveStreamProvider,
} from "../types";

// ----- Helpers -----

function snakeToCamelKey(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** تحويل صف (snake_case) إلى شكل التطبيق (camelCase) — يطابق سلوك rowToCamel في الملف القديم */
function rowToCamel<T = Record<string, unknown>>(
  row: Record<string, unknown> | null | undefined,
): T | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamelKey(k)] = v;
  }
  return out as T;
}

function rowsToCamel<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => rowToCamel(r) as T);
}

/** تحويل صف كورس (من Prisma، Decimal للسعر) إلى شكل camelCase مع تحويل السعر لنص */
function courseToCamel(
  row: Record<string, unknown>,
  opts?: { category?: Record<string, unknown> | null; rating?: number | null; ratingCount?: number },
): Record<string, unknown> {
  const price = toStr((row as { price?: unknown }).price);
  const camel = rowToCamel({ ...row, price }) as Record<string, unknown>;
  if (opts) {
    if (opts.category !== undefined) camel.category = opts.category;
    if (opts.rating !== undefined) camel.courseRating = opts.rating;
    if (opts.ratingCount !== undefined) camel.courseRatingCount = opts.ratingCount;
  }
  return camel;
}

function categoryToCamel(
  cat: { id: string; name: string; name_ar: string | null; slug: string } | null | undefined,
): { id: string; name: string; nameAr: string | null; slug: string } | null {
  if (!cat) return null;
  return { id: cat.id, name: cat.name, nameAr: cat.name_ar, slug: cat.slug };
}

/** متوسط وعدد تقييمات كل كورس (مبني على LessonRating.course_id) */
async function getCourseRatingsMap(
  courseIds: string[],
): Promise<Map<string, { avg: number | null; count: number }>> {
  const map = new Map<string, { avg: number | null; count: number }>();
  const uniq = [...new Set(courseIds)];
  if (uniq.length === 0) return map;
  const grouped = await prisma.lessonRating.groupBy({
    by: ["course_id"],
    where: { course_id: { in: uniq } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const g of grouped) {
    const avg = g._avg.rating;
    map.set(g.course_id, {
      avg: avg == null ? null : Math.round(avg * 100) / 100,
      count: g._count._all,
    });
  }
  return map;
}

async function getCourseRatingSingle(courseId: string): Promise<{ avg: number | null; count: number }> {
  const map = await getCourseRatingsMap([courseId]);
  return map.get(courseId) ?? { avg: null, count: 0 };
}

/** يطابق سلوك الملف القديم — لا حاجة لإنشاء/فحص الجدول لأن Prisma schema يضمن وجوده دائماً */
export async function ensureLessonRatingsSchema(): Promise<void> {
  // no-op
}

// ----- Course -----

export async function getCourseBySlug(slug: string): Promise<(Course & { category?: Category }) | null> {
  const course = await prisma.course.findFirst({
    where: { slug, is_published: true },
    include: { Category: true },
  });
  if (!course) return null;
  const { Category: cat, ...rest } = course;
  const rating = await getCourseRatingSingle(course.id);
  return courseToCamel(rest as unknown as Record<string, unknown>, {
    category: categoryToCamel(cat),
    rating: rating.avg,
    ratingCount: rating.count,
  }) as unknown as Course & { category?: Category };
}

export async function getCourseById(id: string): Promise<Course | null> {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) return null;
  const rating = await getCourseRatingSingle(id);
  return courseToCamel(course as unknown as Record<string, unknown>, {
    rating: rating.avg,
    ratingCount: rating.count,
  }) as unknown as Course;
}

export async function getCourseBySlugOrId(slugOrId: string): Promise<Course | null> {
  if (/^c[a-z0-9]{24}$/i.test(slugOrId)) {
    return getCourseById(slugOrId);
  }
  const course = await prisma.course.findFirst({
    where: { slug: slugOrId, is_published: true },
  });
  if (!course) return null;
  const rating = await getCourseRatingSingle(course.id);
  return courseToCamel(course as unknown as Record<string, unknown>, {
    rating: rating.avg,
    ratingCount: rating.count,
  }) as unknown as Course;
}

async function getCoursesPublishedUncached(withCategory: boolean): Promise<(Course & { category?: Category })[]> {
  const courses = await prisma.course.findMany({
    where: { is_published: true },
    include: withCategory ? { Category: true } : undefined,
    orderBy: [{ order: "asc" }, { created_at: "desc" }],
  });
  const ratings = await getCourseRatingsMap(courses.map((c) => c.id));
  return courses.map((c) => {
    const { Category: cat, ...rest } = c as typeof c & { Category?: { id: string; name: string; name_ar: string | null; slug: string } | null };
    const r = ratings.get(c.id) ?? { avg: null, count: 0 };
    return courseToCamel(rest as unknown as Record<string, unknown>, {
      category: withCategory ? categoryToCamel(cat) : undefined,
      rating: r.avg,
      ratingCount: r.count,
    });
  }) as unknown as (Course & { category?: Category })[];
}

const getCoursesPublishedCached = unstable_cache(
  async (withCategory: boolean) => getCoursesPublishedUncached(withCategory),
  ["courses-published-v1"],
  { revalidate: 60, tags: [CACHE_TAGS.publishedCourses] },
);

export async function getCoursesPublished(withCategory = true): Promise<(Course & { category?: Category })[]> {
  return getCoursesPublishedCached(withCategory);
}

/** يعيد خريطة معرف كورس → slug للكورسات المنشورة فقط (لروابط السلايدر في الصفحة الرئيسية) */
export async function getPublishedCourseSlugsByIds(ids: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  const map = new Map<string, string>();
  if (uniq.length === 0) return map;
  const rows = await prisma.course.findMany({
    where: { id: { in: uniq }, is_published: true },
    select: { id: true, slug: true },
  });
  for (const r of rows) map.set(r.id, r.slug);
  return map;
}

type CourseWithCountsRow = Record<string, unknown> & {
  lessonsCount: number;
  enrollmentsCount: number;
  category?: { id: string; name: string; nameAr?: string | null; slug: string } | null;
};

export async function getCoursesWithCounts(): Promise<CourseWithCountsRow[]> {
  const courses = await prisma.course.findMany({
    include: { Category: true, _count: { select: { Lesson: true, Enrollment: true } } },
  });
  const sorted = [...courses].sort((a, b) => {
    const catOrderA = a.Category?.order ?? Number.POSITIVE_INFINITY;
    const catOrderB = b.Category?.order ?? Number.POSITIVE_INFINITY;
    if (catOrderA !== catOrderB) return catOrderA - catOrderB;
    if (a.order !== b.order) return a.order - b.order;
    return b.created_at.getTime() - a.created_at.getTime();
  });
  const ratings = await getCourseRatingsMap(sorted.map((c) => c.id));
  return sorted.map((c) => {
    const { Category: cat, _count, ...rest } = c;
    const r = ratings.get(c.id) ?? { avg: null, count: 0 };
    const camel = courseToCamel(rest as unknown as Record<string, unknown>, {
      category: categoryToCamel(cat),
      rating: r.avg,
      ratingCount: r.count,
    });
    return { ...camel, lessonsCount: _count.Lesson, enrollmentsCount: _count.Enrollment } as CourseWithCountsRow;
  });
}

/** كورسات منشأة من مستخدم معيّن (لوحة مدرس) */
export async function getCoursesWithCountsForCreator(creatorId: string): Promise<CourseWithCountsRow[]> {
  const courses = await prisma.course.findMany({
    where: { created_by_id: creatorId },
    include: { Category: true, _count: { select: { Lesson: true, Enrollment: true } } },
  });
  const sorted = [...courses].sort((a, b) => {
    const catOrderA = a.Category?.order ?? Number.POSITIVE_INFINITY;
    const catOrderB = b.Category?.order ?? Number.POSITIVE_INFINITY;
    if (catOrderA !== catOrderB) return catOrderA - catOrderB;
    if (a.order !== b.order) return a.order - b.order;
    return b.created_at.getTime() - a.created_at.getTime();
  });
  const ratings = await getCourseRatingsMap(sorted.map((c) => c.id));
  return sorted.map((c) => {
    const { Category: cat, _count, ...rest } = c;
    const r = ratings.get(c.id) ?? { avg: null, count: 0 };
    const camel = courseToCamel(rest as unknown as Record<string, unknown>, {
      category: categoryToCamel(cat),
      rating: r.avg,
      ratingCount: r.count,
    });
    return { ...camel, lessonsCount: _count.Lesson, enrollmentsCount: _count.Enrollment } as CourseWithCountsRow;
  });
}

export async function getCoursesAll(): Promise<(Course & { category?: Category })[]> {
  const courses = await prisma.course.findMany({
    include: { Category: true },
    orderBy: [{ order: "asc" }, { created_at: "desc" }],
  });
  const ratings = await getCourseRatingsMap(courses.map((c) => c.id));
  return courses.map((c) => {
    const { Category: cat, ...rest } = c;
    const r = ratings.get(c.id) ?? { avg: null, count: 0 };
    return courseToCamel(rest as unknown as Record<string, unknown>, {
      category: categoryToCamel(cat),
      rating: r.avg,
      ratingCount: r.count,
    });
  }) as unknown as (Course & { category?: Category })[];
}

export async function courseExistsBySlug(slug: string): Promise<boolean> {
  const course = await prisma.course.findFirst({ where: { slug }, select: { id: true } });
  return !!course;
}

export async function createCourse(data: {
  title: string;
  title_ar: string;
  slug: string;
  description: string;
  description_en?: string | null;
  short_desc?: string | null;
  short_desc_en?: string | null;
  image_url?: string | null;
  price: number;
  is_published: boolean;
  created_by_id: string;
  max_quiz_attempts?: number | null;
  category_id?: string | null;
  accepts_homework?: boolean;
}): Promise<Course> {
  const created = await prisma.course.create({
    data: {
      id: generateId(),
      title: data.title,
      title_ar: data.title_ar,
      slug: data.slug,
      description: data.description,
      description_en: data.description_en ?? null,
      short_desc: data.short_desc ?? null,
      short_desc_en: data.short_desc_en ?? null,
      image_url: data.image_url ?? null,
      price: data.price,
      is_published: data.is_published,
      created_by_id: data.created_by_id,
      max_quiz_attempts: data.max_quiz_attempts ?? null,
      category_id: data.category_id ?? null,
      accepts_homework: data.accepts_homework ?? false,
    },
  });
  return courseToCamel(created as unknown as Record<string, unknown>) as unknown as Course;
}

export async function updateCourse(
  id: string,
  data: {
    title?: string;
    title_ar?: string;
    description?: string;
    description_en?: string | null;
    short_desc?: string | null;
    short_desc_en?: string | null;
    image_url?: string | null;
    price?: number;
    is_published?: boolean;
    max_quiz_attempts?: number | null;
    category_id?: string | null;
    accepts_homework?: boolean;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.title_ar !== undefined) patch.title_ar = data.title_ar;
  if (data.description !== undefined) patch.description = data.description;
  if (data.description_en !== undefined) patch.description_en = data.description_en;
  if (data.short_desc !== undefined) patch.short_desc = data.short_desc;
  if (data.short_desc_en !== undefined) patch.short_desc_en = data.short_desc_en;
  if (data.image_url !== undefined) patch.image_url = data.image_url;
  if (data.price !== undefined) patch.price = data.price;
  if (data.is_published !== undefined) patch.is_published = data.is_published;
  if (data.max_quiz_attempts !== undefined) patch.max_quiz_attempts = data.max_quiz_attempts;
  if (data.category_id !== undefined) patch.category_id = data.category_id;
  if (data.accepts_homework !== undefined) patch.accepts_homework = data.accepts_homework;
  if (Object.keys(patch).length === 0) return;
  patch.updated_at = new Date();
  await prisma.course.updateMany({ where: { id }, data: patch });
}

export async function deleteCourse(id: string): Promise<void> {
  await prisma.course.deleteMany({ where: { id } });
}

// ----- Lesson -----

export async function getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
  const rows = await prisma.lesson.findMany({ where: { course_id: courseId }, orderBy: { order: "asc" } });
  return rows as unknown as Lesson[];
}

export async function getLessonBySlug(courseId: string, lessonSlug: string): Promise<Lesson | null> {
  const row = await prisma.lesson.findFirst({ where: { course_id: courseId, slug: lessonSlug } });
  return (row as unknown as Lesson) ?? null;
}

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const row = await prisma.lesson.findUnique({ where: { id: lessonId } });
  return (row as unknown as Lesson) ?? null;
}

export async function createLesson(data: {
  course_id: string;
  title: string;
  title_ar?: string | null;
  slug: string;
  content?: string | null;
  video_url?: string | null;
  pdf_url?: string | null;
  order: number;
  accepts_homework?: boolean;
}): Promise<Lesson> {
  const created = await prisma.lesson.create({
    data: {
      id: generateId(),
      course_id: data.course_id,
      title: data.title,
      title_ar: data.title_ar ?? null,
      slug: data.slug,
      content: data.content ?? null,
      video_url: data.video_url ?? null,
      pdf_url: data.pdf_url ?? null,
      order: data.order,
      accepts_homework: data.accepts_homework ?? false,
    },
  });
  return created as unknown as Lesson;
}

export async function deleteLessonsByCourseId(courseId: string): Promise<void> {
  await prisma.lesson.deleteMany({ where: { course_id: courseId } });
}

/** جلب كورس مع الحصص والاختبارات (عدد أسئلة كل اختبار) — للصفحة التفصيلية */
export const getCourseWithContent = cache(async function getCourseWithContent(
  segment: string,
): Promise<{
  course: (Course & { category?: Record<string, unknown> }) | null;
  lessons: Record<string, unknown>[];
  quizzes: Array<Record<string, unknown> & { _count: { questions: number } }>;
} | null> {
  const isId = /^c[a-z0-9]{22}$/i.test(segment);
  let courseRow: Record<string, unknown> | null = null;

  if (isId) {
    const course = await prisma.course.findFirst({
      where: { id: segment, is_published: true },
      include: { Category: true },
    });
    if (!course) return null;
    const { Category: cat, ...rest } = course;
    courseRow = {
      ...(courseToCamel(rest as unknown as Record<string, unknown>) as Record<string, unknown>),
      category: categoryToCamel(cat),
    };
  } else {
    const c = await getCourseBySlug(segment);
    if (!c) return null;
    courseRow = c as unknown as Record<string, unknown>;
  }

  const courseId = courseRow.id as string;
  const [lessons, quizzes] = await Promise.all([
    prisma.lesson.findMany({ where: { course_id: courseId }, orderBy: { order: "asc" } }),
    prisma.quiz.findMany({
      where: { course_id: courseId },
      orderBy: { order: "asc" },
      include: { _count: { select: { Question: true } } },
    }),
  ]);

  const lessonsOut = rowsToCamel(lessons as unknown as Record<string, unknown>[]);
  const quizzesOut = quizzes.map((q) => {
    const { _count, ...rest } = q;
    return {
      ...(rowToCamel(rest as unknown as Record<string, unknown>) as Record<string, unknown>),
      _count: { questions: _count.Question },
    };
  }) as Array<Record<string, unknown> & { _count: { questions: number } }>;

  return {
    course: courseRow as unknown as Course & { category?: Record<string, unknown> },
    lessons: lessonsOut,
    quizzes: quizzesOut,
  };
});

/** جلب دورة كاملة مع حصص واختبارات (أسئلة + خيارات) — لصفحة التعديل */
export async function getCourseForEdit(courseId: string): Promise<{
  course: Record<string, unknown> | null;
  lessons: Record<string, unknown>[];
  quizzes: Array<Record<string, unknown> & { questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }> }>;
} | null> {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return null;

  const [lessons, quizzes] = await Promise.all([
    prisma.lesson.findMany({ where: { course_id: courseId }, orderBy: { order: "asc" } }),
    prisma.quiz.findMany({
      where: { course_id: courseId },
      orderBy: { order: "asc" },
      include: {
        Question: {
          orderBy: { order: "asc" },
          include: { QuestionOption: { orderBy: { id: "asc" } } },
        },
      },
    }),
  ]);

  const quizzesOut = quizzes.map((q) => {
    const { Question: questions, ...quizRest } = q;
    const questionsOut = questions.map((qu) => {
      const { QuestionOption: options, ...quRest } = qu;
      return {
        ...(rowToCamel(quRest as unknown as Record<string, unknown>) as Record<string, unknown>),
        options: options.map((opt) => rowToCamel(opt as unknown as Record<string, unknown>)!),
      };
    });
    return {
      ...(rowToCamel(quizRest as unknown as Record<string, unknown>) as Record<string, unknown>),
      questions: questionsOut,
    };
  }) as Array<Record<string, unknown> & { questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }> }>;

  return {
    course: courseToCamel(course as unknown as Record<string, unknown>),
    lessons: rowsToCamel(lessons as unknown as Record<string, unknown>[]),
    quizzes: quizzesOut,
  };
}

/** دورات الطالب: المسجّل فيها + الدورات المتاحة عبر أكواد (حصص/اختبارات محددة) + كل الدورات المدفوعة المنشورة عند اشتراك منصة نشط */
export async function getAccessibleCoursesForUser(userId: string): Promise<(Course & { category?: Category })[]> {
  const [enrollments, lessonCodes, quizCodes, activeSub] = await Promise.all([
    prisma.enrollment.findMany({ where: { user_id: userId }, select: { course_id: true } }),
    prisma.activationCodeLesson.findMany({
      where: { ActivationCode: { used_by_user_id: userId, used_at: { not: null } } },
      select: { ActivationCode: { select: { course_id: true } } },
    }),
    prisma.activationCodeQuiz.findMany({
      where: { ActivationCode: { used_by_user_id: userId, used_at: { not: null } } },
      select: { ActivationCode: { select: { course_id: true } } },
    }),
    prisma.userPlatformSubscription.findFirst({
      where: { user_id: userId, expires_at: { gt: new Date() } },
      select: { id: true },
    }),
  ]);

  const idSet = new Set<string>();
  for (const e of enrollments) idSet.add(e.course_id);
  for (const lc of lessonCodes) idSet.add(lc.ActivationCode.course_id);
  for (const qc of quizCodes) idSet.add(qc.ActivationCode.course_id);

  if (activeSub) {
    const paidPublished = await prisma.course.findMany({
      where: { is_published: true, price: { gt: 0 } },
      select: { id: true },
    });
    for (const c of paidPublished) idSet.add(c.id);
  }

  if (idSet.size === 0) return [];

  const courses = await prisma.course.findMany({
    where: { id: { in: [...idSet] } },
    include: { Category: true },
    orderBy: { created_at: "desc" },
  });
  const ratings = await getCourseRatingsMap(courses.map((c) => c.id));
  return courses.map((c) => {
    const { Category: cat, ...rest } = c;
    const r = ratings.get(c.id) ?? { avg: null, count: 0 };
    return courseToCamel(rest as unknown as Record<string, unknown>, {
      category: categoryToCamel(cat),
      rating: r.avg,
      ratingCount: r.count,
    });
  }) as unknown as (Course & { category?: Category })[];
}

/** دورات الطالب المسجّل فيها — بنفس شكل الكورسات في الصفحة الرئيسية (للعرض كبطاقات) */
export async function getEnrolledCoursesForUser(userId: string): Promise<(Course & { category?: Category })[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { user_id: userId },
    orderBy: { enrolled_at: "desc" },
    include: { Course: { include: { Category: true } } },
  });
  const ratings = await getCourseRatingsMap(enrollments.map((e) => e.Course.id));
  return enrollments.map((e) => {
    const { Category: cat, ...rest } = e.Course;
    const r = ratings.get(e.Course.id) ?? { avg: null, count: 0 };
    return courseToCamel(rest as unknown as Record<string, unknown>, {
      category: categoryToCamel(cat),
      rating: r.avg,
      ratingCount: r.count,
    });
  }) as unknown as (Course & { category?: Category })[];
}

export async function countCourses(): Promise<number> {
  return prisma.course.count();
}

// ----- Quiz / Question / QuestionOption -----

export async function getQuizById(quizId: string): Promise<{
  quiz: Record<string, unknown>;
  course: Record<string, unknown>;
  questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }>;
} | null> {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return null;

  const [course, questions] = await Promise.all([
    prisma.course.findUnique({ where: { id: quiz.course_id } }),
    prisma.question.findMany({
      where: { quiz_id: quizId },
      orderBy: { order: "asc" },
      include: { QuestionOption: { orderBy: { id: "asc" } } },
    }),
  ]);
  if (!course) return null;

  const questionsOut = questions.map((q) => {
    const { QuestionOption: options, ...rest } = q;
    return {
      ...(rowToCamel(rest as unknown as Record<string, unknown>) as Record<string, unknown>),
      options: options.map((opt) => rowToCamel(opt as unknown as Record<string, unknown>)!),
    };
  }) as Array<Record<string, unknown> & { options: Record<string, unknown>[] }>;

  return {
    quiz: rowToCamel(quiz as unknown as Record<string, unknown>)!,
    course: courseToCamel(course as unknown as Record<string, unknown>),
    questions: questionsOut,
  };
}

export async function createQuiz(data: {
  course_id: string;
  title: string;
  title_ar?: string | null;
  order: number;
  time_limit_minutes?: number | null;
}): Promise<Quiz> {
  // ملاحظة: عمود title_ar غير موجود في جدول Quiz بمخطط Prisma الحالي — يُقبل ضمن التوقيع للتوافق فقط
  const created = await prisma.quiz.create({
    data: {
      id: generateId(),
      course_id: data.course_id,
      title: data.title,
      order: data.order,
      time_limit_minutes: data.time_limit_minutes ?? null,
    },
  });
  return created as unknown as Quiz;
}

export async function createQuestion(data: {
  quiz_id: string;
  type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE";
  question_text: string;
  order: number;
}): Promise<Question> {
  const created = await prisma.question.create({
    data: {
      id: generateId(),
      quiz_id: data.quiz_id,
      type: data.type,
      question_text: data.question_text,
      order: data.order,
    },
  });
  return created as unknown as Question;
}

export async function createQuestionOption(data: {
  question_id: string;
  text: string;
  is_correct: boolean;
}): Promise<QuestionOption> {
  const created = await prisma.questionOption.create({
    data: {
      id: generateId(),
      question_id: data.question_id,
      text: data.text,
      is_correct: data.is_correct,
    },
  });
  return created as unknown as QuestionOption;
}

export async function deleteQuizzesByCourseId(courseId: string): Promise<void> {
  await prisma.quiz.deleteMany({ where: { course_id: courseId } });
}

// ----- Enrollment -----

export async function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  const row = await prisma.enrollment.findUnique({
    where: { user_id_course_id: { user_id: userId, course_id: courseId } },
  });
  return (row as unknown as Enrollment) ?? null;
}

export async function createEnrollment(userId: string, courseId: string): Promise<Enrollment> {
  const created = await prisma.enrollment.create({
    data: { id: generateId(), user_id: userId, course_id: courseId },
  });
  return created as unknown as Enrollment;
}

export async function deleteEnrollment(userId: string, courseId: string): Promise<void> {
  await prisma.enrollment.deleteMany({ where: { user_id: userId, course_id: courseId } });
}

export async function getEnrollmentsWithCourseByUserId(
  userId: string,
): Promise<Array<Enrollment & { course: { id: string; title: string; titleAr: string | null; slug: string } }>> {
  const rows = await prisma.enrollment.findMany({
    where: { user_id: userId },
    orderBy: { enrolled_at: "desc" },
    include: { Course: { select: { id: true, title: true, title_ar: true, slug: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    course_id: r.course_id,
    enrolled_at: r.enrolled_at,
    course: { id: r.Course.id, title: r.Course.title, titleAr: r.Course.title_ar, slug: r.Course.slug },
  })) as unknown as Array<Enrollment & { course: { id: string; title: string; titleAr: string | null; slug: string } }>;
}

/** تسجيلات عدة طلاب دفعة واحدة (بدل N استعلام في صفحة الإحصائيات) */
export async function getEnrollmentsWithCourseByUserIds(
  userIds: string[],
): Promise<Map<string, Array<Enrollment & { course: { id: string; title: string; titleAr: string | null; slug: string } }>>> {
  const uniq = [...new Set(userIds.map((id) => String(id).trim()).filter(Boolean))];
  const map = new Map<
    string,
    Array<Enrollment & { course: { id: string; title: string; titleAr: string | null; slug: string } }>
  >();
  for (const id of uniq) map.set(id, []);
  if (uniq.length === 0) return map;

  const rows = await prisma.enrollment.findMany({
    where: { user_id: { in: uniq } },
    orderBy: { enrolled_at: "desc" },
    include: { Course: { select: { id: true, title: true, title_ar: true, slug: true } } },
  });

  for (const r of rows) {
    const list = map.get(r.user_id) ?? [];
    list.push({
      id: r.id,
      user_id: r.user_id,
      course_id: r.course_id,
      enrolled_at: r.enrolled_at,
      course: { id: r.Course.id, title: r.Course.title, titleAr: r.Course.title_ar, slug: r.Course.slug },
    } as unknown as Enrollment & { course: { id: string; title: string; titleAr: string | null; slug: string } });
    map.set(r.user_id, list);
  }
  return map;
}

// ----- ActivationCode (أكواد التفعيل المجانية للدورات) -----

function generateCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createActivationCodes(
  courseId: string,
  count: number,
  lessonIds?: string[] | null,
  quizIds?: string[] | null,
): Promise<{ id: string; code: string }[]> {
  const created: { id: string; code: string }[] = [];
  const seen = new Set<string>();
  const scopedLessonIds = Array.isArray(lessonIds)
    ? Array.from(new Set(lessonIds.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim())))
    : [];
  const scopedQuizIds = Array.isArray(quizIds)
    ? Array.from(new Set(quizIds.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim())))
    : [];

  for (let i = 0; i < count; i++) {
    let code = generateCodeString();
    while (seen.has(code)) code = generateCodeString();
    seen.add(code);
    const id = generateId();
    await prisma.activationCode.create({ data: { id, course_id: courseId, code } });
    if (scopedLessonIds.length > 0) {
      await prisma.activationCodeLesson.createMany({
        data: scopedLessonIds.map((lessonId) => ({ activation_code_id: id, lesson_id: lessonId })),
        skipDuplicates: true,
      });
    }
    if (scopedQuizIds.length > 0) {
      await prisma.activationCodeQuiz.createMany({
        data: scopedQuizIds.map((quizId) => ({ activation_code_id: id, quiz_id: quizId })),
        skipDuplicates: true,
      });
    }
    created.push({ id, code });
  }
  return created;
}

export type ActivationCodeWithCourse = ActivationCode & {
  course_title?: string;
  course_title_ar?: string;
  lessonCount?: number;
  quizCount?: number;
};

export async function listActivationCodes(courseId?: string | null): Promise<ActivationCodeWithCourse[]> {
  const rows = await prisma.activationCode.findMany({
    where: courseId ? { course_id: courseId } : undefined,
    include: {
      Course: { select: { title: true, title_ar: true } },
      _count: { select: { ActivationCodeLesson: true, ActivationCodeQuiz: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return rows.map((r) => {
    const { Course: c, _count, ...rest } = r;
    return {
      ...(rowToCamel(rest as unknown as Record<string, unknown>) as Record<string, unknown>),
      courseTitle: c.title,
      courseTitleAr: c.title_ar,
      lessonCount: _count.ActivationCodeLesson,
      quizCount: _count.ActivationCodeQuiz,
    } as unknown as ActivationCodeWithCourse;
  });
}

export async function listActivationCodesForTeacher(
  teacherId: string,
  courseId?: string | null,
): Promise<ActivationCodeWithCourse[]> {
  const cid = courseId?.trim() || null;
  const rows = await prisma.activationCode.findMany({
    where: {
      Course: { created_by_id: teacherId },
      ...(cid ? { course_id: cid } : {}),
    },
    include: {
      Course: { select: { title: true, title_ar: true } },
      _count: { select: { ActivationCodeLesson: true, ActivationCodeQuiz: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return rows.map((r) => {
    const { Course: c, _count, ...rest } = r;
    return {
      ...(rowToCamel(rest as unknown as Record<string, unknown>) as Record<string, unknown>),
      courseTitle: c.title,
      courseTitleAr: c.title_ar,
      lessonCount: _count.ActivationCodeLesson,
      quizCount: _count.ActivationCodeQuiz,
    } as unknown as ActivationCodeWithCourse;
  });
}

export async function getActivationCodeByCode(
  code: string,
): Promise<(ActivationCode & { courseId: string; lessonIds: string[]; quizIds: string[] }) | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const row = await prisma.activationCode.findFirst({
    where: { code: { equals: trimmed, mode: "insensitive" }, used_at: null },
    include: {
      ActivationCodeLesson: { select: { lesson_id: true } },
      ActivationCodeQuiz: { select: { quiz_id: true } },
    },
  });
  if (!row) return null;
  const { ActivationCodeLesson: lessons, ActivationCodeQuiz: quizzes, ...rest } = row;
  const base = rowToCamel(rest as unknown as Record<string, unknown>) as ActivationCode & { courseId: string };
  return {
    ...base,
    lessonIds: lessons.map((l) => l.lesson_id),
    quizIds: quizzes.map((q) => q.quiz_id),
  };
}

export async function useActivationCode(
  codeId: string,
  userId: string,
): Promise<{ courseId: string; lessonIds: string[]; quizIds: string[] } | null> {
  const updateResult = await prisma.activationCode.updateMany({
    where: { id: codeId, used_at: null },
    data: { used_at: new Date(), used_by_user_id: userId },
  });
  if (updateResult.count === 0) return null;

  const ac = await prisma.activationCode.findUnique({
    where: { id: codeId },
    include: {
      ActivationCodeLesson: { select: { lesson_id: true } },
      ActivationCodeQuiz: { select: { quiz_id: true } },
    },
  });
  if (!ac) return null;

  const lessonIds = ac.ActivationCodeLesson.map((l) => l.lesson_id);
  const quizIds = ac.ActivationCodeQuiz.map((q) => q.quiz_id);

  if (lessonIds.length === 0 && quizIds.length === 0) {
    await createEnrollment(userId, ac.course_id);
  }
  return { courseId: ac.course_id, lessonIds, quizIds };
}

/** الحصص المسموح بها لطالب داخل كورس عبر أكواد حصص محددة */
export async function getAllowedLessonIdsForUserCourse(userId: string, courseId: string): Promise<string[]> {
  try {
    const rows = await prisma.activationCodeLesson.findMany({
      where: { ActivationCode: { used_by_user_id: userId, course_id: courseId, used_at: { not: null } } },
      select: { lesson_id: true },
      distinct: ["lesson_id"],
    });
    return rows.map((r) => r.lesson_id);
  } catch {
    return [];
  }
}

/** الاختبارات المسموح بها لطالب داخل كورس عبر أكواد اختبارات محددة */
export async function getAllowedQuizIdsForUserCourse(userId: string, courseId: string): Promise<string[]> {
  try {
    const rows = await prisma.activationCodeQuiz.findMany({
      where: { ActivationCode: { used_by_user_id: userId, course_id: courseId, used_at: { not: null } } },
      select: { quiz_id: true },
      distinct: ["quiz_id"],
    });
    return rows.map((r) => r.quiz_id);
  } catch {
    return [];
  }
}

/** هل الطالب لديه وصول جزئي (حصص أو اختبارات محددة) للكورس عبر كود؟ */
export async function hasPartialCourseAccess(userId: string, courseId: string): Promise<boolean> {
  const [lessons, quizzes] = await Promise.all([
    getAllowedLessonIdsForUserCourse(userId, courseId),
    getAllowedQuizIdsForUserCourse(userId, courseId),
  ]);
  return lessons.length > 0 || quizzes.length > 0;
}

export async function deleteActivationCode(id: string): Promise<void> {
  await prisma.activationCode.deleteMany({ where: { id } });
}

export async function deleteActivationCodes(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.activationCode.deleteMany({ where: { id: { in: ids } } });
}

// ----- LessonRating -----

export type LessonRatingSummary = {
  lessonId: string;
  courseId: string;
  averageRating: number | null;
  ratingCount: number;
  courseAverageRating: number | null;
  courseRatingCount: number;
  userRating: number | null;
};

export async function getLessonRatingSummary(
  lessonId: string,
  userId?: string | null,
): Promise<LessonRatingSummary | null> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return null;

  const [lessonAgg, courseAgg, userRatingRow] = await Promise.all([
    prisma.lessonRating.aggregate({
      where: { lesson_id: lessonId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.lessonRating.aggregate({
      where: { course_id: lesson.course_id },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    userId
      ? prisma.lessonRating.findUnique({
          where: { lesson_id_user_id: { lesson_id: lessonId, user_id: userId } },
        })
      : Promise.resolve(null),
  ]);

  return {
    lessonId: lesson.id,
    courseId: lesson.course_id,
    averageRating: lessonAgg._avg.rating == null ? null : Number(lessonAgg._avg.rating),
    ratingCount: lessonAgg._count._all,
    courseAverageRating: courseAgg._avg.rating == null ? null : Number(courseAgg._avg.rating),
    courseRatingCount: courseAgg._count._all,
    userRating: userRatingRow ? userRatingRow.rating : null,
  };
}

export async function upsertLessonRating(data: {
  lesson_id: string;
  user_id: string;
  course_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
}): Promise<LessonRating> {
  const row = await prisma.lessonRating.upsert({
    where: { lesson_id_user_id: { lesson_id: data.lesson_id, user_id: data.user_id } },
    create: {
      id: generateId(),
      lesson_id: data.lesson_id,
      user_id: data.user_id,
      course_id: data.course_id,
      rating: data.rating,
    },
    update: {
      rating: data.rating,
      course_id: data.course_id,
      updated_at: new Date(),
    },
  });
  return rowToCamel(row as unknown as Record<string, unknown>) as unknown as LessonRating;
}

// ----- HomeworkSubmission -----

export type HomeworkSubmissionWithDetails = HomeworkSubmission & {
  course_title?: string;
  course_title_ar?: string;
  user_name?: string;
  lesson_title?: string;
  lesson_title_ar?: string;
};

export async function createHomeworkSubmission(data: {
  course_id: string;
  user_id: string;
  submission_type: "link" | "pdf" | "image";
  lesson_id?: string | null;
  link_url?: string | null;
  file_url?: string | null;
  file_name?: string | null;
}): Promise<HomeworkSubmission> {
  const created = await prisma.homeworkSubmission.create({
    data: {
      id: generateId(),
      course_id: data.course_id,
      user_id: data.user_id,
      lesson_id: data.lesson_id ?? null,
      submission_type: data.submission_type,
      link_url: data.link_url ?? null,
      file_url: data.file_url ?? null,
      file_name: data.file_name ?? null,
    },
  });
  return rowToCamel(created as unknown as Record<string, unknown>) as unknown as HomeworkSubmission;
}

export async function listHomeworkSubmissionsForAdmin(
  studentNameSearch?: string | null,
): Promise<HomeworkSubmissionWithDetails[]> {
  const search = studentNameSearch?.trim();
  const rows = await prisma.homeworkSubmission.findMany({
    where: search ? { User: { name: { contains: search, mode: "insensitive" } } } : undefined,
    include: {
      Course: { select: { title: true, title_ar: true } },
      User: { select: { name: true } },
      Lesson: { select: { title: true, title_ar: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return rows.map((r) => {
    const { Course: c, User: u, Lesson: l, ...rest } = r;
    return {
      ...(rowToCamel(rest as unknown as Record<string, unknown>) as Record<string, unknown>),
      courseTitle: c.title,
      courseTitleAr: c.title_ar,
      userName: u.name,
      lessonTitle: l?.title,
      lessonTitleAr: l?.title_ar,
    } as unknown as HomeworkSubmissionWithDetails;
  });
}

export async function listHomeworkSubmissionsForTeacher(
  teacherId: string,
  studentNameSearch?: string | null,
): Promise<HomeworkSubmissionWithDetails[]> {
  const search = studentNameSearch?.trim();
  const rows = await prisma.homeworkSubmission.findMany({
    where: {
      Course: { created_by_id: teacherId },
      ...(search ? { User: { name: { contains: search, mode: "insensitive" } } } : {}),
    },
    include: {
      Course: { select: { title: true, title_ar: true } },
      User: { select: { name: true } },
      Lesson: { select: { title: true, title_ar: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return rows.map((r) => {
    const { Course: c, User: u, Lesson: l, ...rest } = r;
    return {
      ...(rowToCamel(rest as unknown as Record<string, unknown>) as Record<string, unknown>),
      courseTitle: c.title,
      courseTitleAr: c.title_ar,
      userName: u.name,
      lessonTitle: l?.title,
      lessonTitleAr: l?.title_ar,
    } as unknown as HomeworkSubmissionWithDetails;
  });
}

export async function deleteHomeworkSubmissionsByIdsForTeacher(
  teacherId: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await prisma.homeworkSubmission.deleteMany({
    where: { id: { in: ids }, Course: { created_by_id: teacherId } },
  });
  return result.count;
}

export async function getHomeworkSubmissionsByCourseAndUser(
  courseId: string,
  userId: string,
): Promise<HomeworkSubmission[]> {
  const rows = await prisma.homeworkSubmission.findMany({
    where: { course_id: courseId, user_id: userId },
    orderBy: { created_at: "desc" },
  });
  return rows.map((r) => rowToCamel(r as unknown as Record<string, unknown>) as unknown as HomeworkSubmission);
}

export async function getHomeworkSubmissionsByLessonAndUser(
  lessonId: string,
  userId: string,
): Promise<HomeworkSubmission[]> {
  const rows = await prisma.homeworkSubmission.findMany({
    where: { lesson_id: lessonId, user_id: userId },
    orderBy: { created_at: "desc" },
  });
  return rows.map((r) => rowToCamel(r as unknown as Record<string, unknown>) as unknown as HomeworkSubmission);
}

export async function deleteHomeworkSubmissionsByIds(ids: string[]): Promise<number> {
  const validIds = ids.filter((id) => id && String(id).trim());
  if (validIds.length === 0) return 0;
  await prisma.homeworkSubmission.deleteMany({ where: { id: { in: validIds } } });
  return validIds.length;
}

export async function deleteAllHomeworkSubmissions(): Promise<void> {
  await prisma.homeworkSubmission.deleteMany({});
}

// ----- QuizAttempt -----

/** Every started quiz session in the course (including in-progress 0/0 rows). */
export async function countQuizAttemptsByUserAndCourse(userId: string, courseId: string): Promise<number> {
  return prisma.quizAttempt.count({ where: { user_id: userId, Quiz: { course_id: courseId } } });
}

/** In-progress attempt started via /start but not submitted yet (0/0). */
export async function getInProgressQuizAttemptId(userId: string, quizId: string): Promise<string | null> {
  const row = await prisma.quizAttempt.findFirst({
    where: { user_id: userId, quiz_id: quizId, total_questions: 0 },
    orderBy: { created_at: "desc" },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function createQuizAttempt(
  userId: string,
  quizId: string,
  score: number,
  totalQuestions: number,
): Promise<void> {
  await prisma.quizAttempt.create({
    data: {
      id: generateId(),
      user_id: userId,
      quiz_id: quizId,
      score,
      total_questions: totalQuestions,
      updated_at: new Date(),
    },
  });
}

/** إنشاء محاولة وإرجاع معرّفها (لاستخدامها عند بدء الاختبار) */
export async function createQuizAttemptReturningId(
  userId: string,
  quizId: string,
  score: number,
  totalQuestions: number,
): Promise<string> {
  const id = generateId();
  await prisma.quizAttempt.create({
    data: {
      id,
      user_id: userId,
      quiz_id: quizId,
      score,
      total_questions: totalQuestions,
      updated_at: new Date(),
    },
  });
  return id;
}

/** تحديث محاولة قائمة — تُستخدم عند تسليم نتيجة محاولة بدأت مسبقاً */
export async function updateQuizAttemptById(params: {
  attemptId: string;
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
}): Promise<boolean> {
  const { attemptId, userId, quizId, score, totalQuestions } = params;
  const result = await prisma.quizAttempt.updateMany({
    where: { id: attemptId, user_id: userId, quiz_id: quizId },
    data: { score, total_questions: totalQuestions, updated_at: new Date() },
  });
  return result.count > 0;
}

export async function getQuizAttemptsByUserId(
  userId: string,
): Promise<Array<{ quizTitle: string; courseTitle: string; score: number; totalQuestions: number; createdAt: Date }>> {
  const rows = await prisma.quizAttempt.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    include: { Quiz: { select: { title: true, Course: { select: { title: true } } } } },
  });
  return rows.map((r) => ({
    quizTitle: r.Quiz.title,
    courseTitle: r.Quiz.Course.title,
    score: r.score,
    totalQuestions: r.total_questions,
    createdAt: r.created_at,
  }));
}

export async function getAllQuizAttemptsForAdmin(limit = 500): Promise<
  Array<{
    userId: string;
    userName: string;
    userEmail: string;
    quizId: string;
    quizTitle: string;
    courseId: string;
    courseTitle: string;
    score: number;
    totalQuestions: number;
    createdAt: Date;
  }>
> {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 2000);
  const rows = await prisma.quizAttempt.findMany({
    take: safeLimit,
    orderBy: { created_at: "desc" },
    include: {
      User: { select: { id: true, name: true, email: true } },
      Quiz: { select: { id: true, title: true, Course: { select: { id: true, title: true } } } },
    },
  });
  return rows.map((r) => ({
    userId: r.User.id,
    userName: r.User.name,
    userEmail: r.User.email,
    quizId: r.Quiz.id,
    quizTitle: r.Quiz.title,
    courseId: r.Quiz.Course.id,
    courseTitle: r.Quiz.Course.title,
    score: r.score,
    totalQuestions: r.total_questions,
    createdAt: r.created_at,
  }));
}

export async function getQuizAttemptsForTeacher(teacherId: string): Promise<
  Array<{
    userId: string;
    userName: string;
    userEmail: string;
    quizId: string;
    quizTitle: string;
    courseId: string;
    courseTitle: string;
    score: number;
    totalQuestions: number;
    createdAt: Date;
  }>
> {
  const rows = await prisma.quizAttempt.findMany({
    where: { Quiz: { Course: { created_by_id: teacherId } } },
    orderBy: { created_at: "desc" },
    include: {
      User: { select: { id: true, name: true, email: true } },
      Quiz: { select: { id: true, title: true, Course: { select: { id: true, title: true } } } },
    },
  });
  return rows.map((r) => ({
    userId: r.User.id,
    userName: r.User.name,
    userEmail: r.User.email,
    quizId: r.Quiz.id,
    quizTitle: r.Quiz.title,
    courseId: r.Quiz.Course.id,
    courseTitle: r.Quiz.Course.title,
    score: r.score,
    totalQuestions: r.total_questions,
    createdAt: r.created_at,
  }));
}

/** إجمالي أرباح المنصة (كورسات + اشتراكات + متجر) */
export async function getTotalPlatformEarnings(): Promise<number> {
  const [paymentsAgg, subsAgg, storeAgg] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.userPlatformSubscription.aggregate({ _sum: { price_paid: true } }),
    prisma.userStorePurchase.aggregate({ _sum: { price_paid: true } }),
  ]);
  return toNum(paymentsAgg._sum.amount) + toNum(subsAgg._sum.price_paid) + toNum(storeAgg._sum.price_paid);
}

export async function getTotalEarningsForTeacher(teacherId: string): Promise<number> {
  const agg = await prisma.payment.aggregate({
    where: { Course: { created_by_id: teacherId } },
    _sum: { amount: true },
  });
  return toNum(agg._sum.amount);
}

export async function createPayment(userId: string, courseId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await prisma.payment.create({
    data: { id: generateId(), user_id: userId, course_id: courseId, amount },
  });
}

// ----- LiveStream -----

export async function getLiveStreamsByCourseId(courseId: string): Promise<LiveStream[]> {
  const rows = await prisma.liveStream.findMany({
    where: { course_id: courseId },
    orderBy: [{ order: "asc" }, { scheduled_at: "asc" }],
  });
  return rowsToCamel(rows as unknown as Record<string, unknown>[]) as unknown as LiveStream[];
}

export async function getLiveStreamsAll(): Promise<
  (LiveStream & { course?: { id: string; title: string; slug: string } })[]
> {
  const rows = await prisma.liveStream.findMany({
    include: { Course: { select: { id: true, title: true, slug: true } } },
    orderBy: { scheduled_at: "desc" },
  });
  return rows.map((r) => {
    const { Course: c, ...rest } = r;
    return {
      ...(rowToCamel(rest as unknown as Record<string, unknown>) as Record<string, unknown>),
      course: c ? { id: c.id, title: c.title, slug: c.slug } : undefined,
    };
  }) as unknown as (LiveStream & { course?: { id: string; title: string; slug: string } })[];
}

export async function getLiveStreamsForTeacher(
  teacherId: string,
): Promise<(LiveStream & { course?: { id: string; title: string; slug: string } })[]> {
  const rows = await prisma.liveStream.findMany({
    where: { Course: { created_by_id: teacherId } },
    include: { Course: { select: { id: true, title: true, slug: true } } },
    orderBy: { scheduled_at: "desc" },
  });
  return rows.map((r) => {
    const { Course: c, ...rest } = r;
    return {
      ...(rowToCamel(rest as unknown as Record<string, unknown>) as Record<string, unknown>),
      course: c ? { id: c.id, title: c.title, slug: c.slug } : undefined,
    };
  }) as unknown as (LiveStream & { course?: { id: string; title: string; slug: string } })[];
}

export async function getLiveStreamById(id: string): Promise<LiveStream | null> {
  const row = await prisma.liveStream.findUnique({ where: { id } });
  return row ? (rowToCamel(row as unknown as Record<string, unknown>) as unknown as LiveStream) : null;
}

export async function createLiveStream(data: {
  course_id: string;
  title: string;
  title_ar?: string | null;
  provider: LiveStreamProvider;
  meeting_url: string;
  meeting_id?: string | null;
  meeting_password?: string | null;
  scheduled_at: Date;
  description?: string | null;
  order?: number;
}): Promise<LiveStream> {
  const created = await prisma.liveStream.create({
    data: {
      id: generateId(),
      course_id: data.course_id,
      title: data.title,
      title_ar: data.title_ar ?? null,
      provider: data.provider,
      meeting_url: data.meeting_url,
      meeting_id: data.meeting_id ?? null,
      meeting_password: data.meeting_password ?? null,
      scheduled_at: data.scheduled_at,
      description: data.description ?? null,
      order: data.order ?? 0,
    },
  });
  return rowToCamel(created as unknown as Record<string, unknown>) as unknown as LiveStream;
}

export async function updateLiveStream(
  id: string,
  data: {
    course_id?: string;
    title?: string;
    title_ar?: string | null;
    provider?: LiveStreamProvider;
    meeting_url?: string;
    meeting_id?: string | null;
    meeting_password?: string | null;
    scheduled_at?: Date;
    description?: string | null;
    order?: number;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (data.course_id !== undefined) patch.course_id = data.course_id;
  if (data.title !== undefined) patch.title = data.title;
  if (data.title_ar !== undefined) patch.title_ar = data.title_ar;
  if (data.provider !== undefined) patch.provider = data.provider;
  if (data.meeting_url !== undefined) patch.meeting_url = data.meeting_url;
  if (data.meeting_id !== undefined) patch.meeting_id = data.meeting_id;
  if (data.meeting_password !== undefined) patch.meeting_password = data.meeting_password;
  if (data.scheduled_at !== undefined) patch.scheduled_at = data.scheduled_at;
  if (data.description !== undefined) patch.description = data.description;
  if (data.order !== undefined) patch.order = data.order;
  if (Object.keys(patch).length === 0) return;
  patch.updated_at = new Date();
  await prisma.liveStream.updateMany({ where: { id }, data: patch });
}

export async function deleteLiveStream(id: string): Promise<void> {
  await prisma.liveStream.deleteMany({ where: { id } });
}

