import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLeaderboard } from "@/lib/gamification";
import { countGlobalLeaderboardStudents } from "@/lib/db";
import { getLocaleFromCookie } from "@/lib/i18n/server";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "للطلاب فقط" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") === "course" ? "course" : "global";
    const courseId = searchParams.get("courseId") ?? undefined;
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20) || 20));
    const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);

    if (scope === "course" && (!courseId || courseId.length < 20)) {
      return NextResponse.json({ error: "معرّف الدورة مطلوب" }, { status: 400 });
    }

    const locale = await getLocaleFromCookie();
    const result = await getLeaderboard({
      scope,
      courseId,
      limit: limit + offset,
      userId: session.user.id,
      locale,
    });

    const entries = result.entries.slice(offset, offset + limit);
    const totalStudents =
      scope === "global" ? await countGlobalLeaderboardStudents() : result.entries.length;

    return NextResponse.json({
      scope,
      courseId: courseId ?? null,
      entries,
      callerRank: result.callerRank,
      callerEntry: result.callerEntry,
      totalStudents,
      offset,
      limit,
    });
  } catch (e) {
    console.error("API leaderboard:", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
