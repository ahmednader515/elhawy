import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourseProgress, getLeaderboard } from "@/lib/gamification";
import { getLocaleFromCookie } from "@/lib/i18n/server";
import { getEnrollment, hasFullCourseAccessAsStudent } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "للطلاب فقط" }, { status: 403 });
    }

    const { courseId } = await params;
    if (!courseId || courseId.length < 20) {
      return NextResponse.json({ error: "معرّف الدورة غير صالح" }, { status: 400 });
    }

    const enrolled = await getEnrollment(session.user.id, courseId);
    const full = await hasFullCourseAccessAsStudent(session.user.id, courseId);
    if (!enrolled && !full) {
      return NextResponse.json({ error: "غير مسجّل في هذه الدورة" }, { status: 403 });
    }

    const locale = await getLocaleFromCookie();
    const [progress, leaderboard] = await Promise.all([
      getCourseProgress(session.user.id, courseId),
      getLeaderboard({
        scope: "course",
        courseId,
        limit: 5,
        userId: session.user.id,
        locale,
      }),
    ]);

    return NextResponse.json({
      progress,
      courseXp: leaderboard.callerEntry?.experiencePoints ?? 0,
      courseRank: leaderboard.callerRank,
      leaderboard: leaderboard.entries,
    });
  } catch (e) {
    console.error("API progress course:", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
