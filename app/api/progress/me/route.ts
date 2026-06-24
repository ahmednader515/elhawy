import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudentGamificationProfile } from "@/lib/gamification";
import { getLocaleFromCookie } from "@/lib/i18n/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "للطلاب فقط" }, { status: 403 });
    }

    const locale = await getLocaleFromCookie();
    const profile = await getStudentGamificationProfile(session.user.id, locale);

    return NextResponse.json(profile);
  } catch (e) {
    console.error("API progress me:", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
