import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLuckWheelFeatureEnabled, listLuckWheelSpinsForUser } from "@/lib/db";
import { LUCK_WHEEL_SEGMENTS } from "@/lib/luck-wheel";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const [enabled, recentSpins] = await Promise.all([
    getLuckWheelFeatureEnabled(),
    listLuckWheelSpinsForUser(session.user.id, 8).catch(() => []),
  ]);

  return NextResponse.json({
    enabled,
    segments: LUCK_WHEEL_SEGMENTS.map((s) => ({
      key: s.key,
      labelAr: s.labelAr,
      labelEn: s.labelEn,
      color: s.color,
      textColor: s.textColor,
    })),
    recentSpins,
  });
}
