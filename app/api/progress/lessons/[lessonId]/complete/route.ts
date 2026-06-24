import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getLessonById,
  getEnrollment,
  hasFullCourseAccessAsStudent,
  getAllowedLessonIdsForUserCourse,
} from "@/lib/db";
import { markLessonComplete } from "@/lib/gamification";

async function canStudentAccessLesson(userId: string, courseId: string, lessonId: string): Promise<boolean> {
  const enrolled = await getEnrollment(userId, courseId);
  if (enrolled) return true;
  const full = await hasFullCourseAccessAsStudent(userId, courseId);
  if (full) return true;
  const allowed = await getAllowedLessonIdsForUserCourse(userId, courseId);
  return allowed.includes(lessonId);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "للطلاب فقط" }, { status: 403 });
    }

    const { lessonId } = await params;
    if (!lessonId || lessonId.length < 20) {
      return NextResponse.json({ error: "معرّف الحصة غير صالح" }, { status: 400 });
    }

    const lesson = await getLessonById(lessonId);
    if (!lesson) {
      return NextResponse.json({ error: "الحصة غير موجودة" }, { status: 404 });
    }

    const courseId = String(lesson.course_id ?? (lesson as { courseId?: string }).courseId ?? "");
    if (!courseId) {
      return NextResponse.json({ error: "الدورة غير معروفة" }, { status: 400 });
    }

    const allowed = await canStudentAccessLesson(session.user.id, courseId, lessonId);
    if (!allowed) {
      return NextResponse.json({ error: "لا تملك صلاحية لهذه الحصة" }, { status: 403 });
    }

    const result = await markLessonComplete(session.user.id, lessonId, courseId);

    return NextResponse.json({
      success: true,
      gamification: result,
      messageKey: result.alreadyCompleted ? "wizard.lessonAlreadyComplete" : "wizard.lessonComplete",
    });
  } catch (e) {
    console.error("API progress lesson complete:", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
