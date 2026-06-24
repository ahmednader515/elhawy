import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  GAMIFICATION_POINT_EVENT_TYPES,
  getGamificationPointValues,
  saveGamificationPointValues,
} from "@/lib/gamification-point-settings";
import type { PointEventType } from "@/lib/gamification-shared";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const values = await getGamificationPointValues();
    return NextResponse.json({ values });
  } catch (e) {
    console.error("API gamification points GET:", e);
    return NextResponse.json({ error: "فشل جلب إعدادات النقاط" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const rawValues = body.values;
  if (!rawValues || typeof rawValues !== "object") {
    return NextResponse.json({ error: "قيم النقاط مطلوبة" }, { status: 400 });
  }

  const input: Partial<Record<PointEventType, number>> = {};
  for (const key of GAMIFICATION_POINT_EVENT_TYPES) {
    if ((rawValues as Record<string, unknown>)[key] === undefined) {
      return NextResponse.json({ error: `الحقل ${key} مطلوب` }, { status: 400 });
    }
    input[key] = Number((rawValues as Record<string, unknown>)[key]);
  }

  try {
    const values = await saveGamificationPointValues(input);
    return NextResponse.json({ success: true, values });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("INVALID_POINTS:")) {
      return NextResponse.json({ error: "قيمة النقاط يجب أن تكون بين 0 و 10000" }, { status: 400 });
    }
    console.error("API gamification points PUT:", e);
    return NextResponse.json({ error: "فشل حفظ إعدادات النقاط" }, { status: 500 });
  }
}
