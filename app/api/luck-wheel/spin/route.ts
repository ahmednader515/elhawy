import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createLuckWheelSpin,
  getLuckWheelFeatureEnabled,
} from "@/lib/db";
import {
  getLuckWheelSegmentIndex,
  pickRandomLuckWheelSegment,
} from "@/lib/luck-wheel";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const enabled = await getLuckWheelFeatureEnabled();
  if (!enabled) {
    return NextResponse.json(
      { error: "عجلة الحظ غير متاحة حالياً" },
      { status: 403 },
    );
  }

  const segment = pickRandomLuckWheelSegment();
  const index = getLuckWheelSegmentIndex(segment.key);

  try {
    const spin = await createLuckWheelSpin({
      userId: session.user.id,
      resultKey: segment.key,
    });
    return NextResponse.json({
      success: true,
      resultKey: segment.key,
      index,
      labelAr: segment.labelAr,
      labelEn: segment.labelEn,
      spinId: spin.id,
      createdAt: spin.createdAt,
    });
  } catch (e) {
    console.error("luck-wheel spin POST", e);
    return NextResponse.json(
      { error: "تعذر تسجيل اللفة. نفّذ scripts/add-luck-wheel.sql إن لزم." },
      { status: 500 },
    );
  }
}
