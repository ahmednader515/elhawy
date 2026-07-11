import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { approveReferralRequest, getReferralRequestById, getUserById } from "@/lib/db";
import { awardReferralPoints } from "@/lib/gamification";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  let body: { referrerUserId?: string; adminNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const referrerUserId = String(body.referrerUserId ?? "").trim();
  if (!referrerUserId) {
    return NextResponse.json({ error: "يجب اختيار حساب الصديق الداعي" }, { status: 400 });
  }

  const referrer = await getUserById(referrerUserId);
  if (!referrer || referrer.role !== "STUDENT") {
    return NextResponse.json({ error: "حساب الداعي غير صالح" }, { status: 400 });
  }

  const existing = await getReferralRequestById(id);
  if (!existing || existing.status !== "PENDING") {
    return NextResponse.json({ error: "الطلب غير موجود أو تمت مراجعته" }, { status: 404 });
  }

  if (existing.userId === referrerUserId) {
    return NextResponse.json({ error: "لا يمكن أن يكون الداعي هو نفس الطالب" }, { status: 400 });
  }

  const updated = await approveReferralRequest({
    id,
    referrerUserId,
    reviewedBy: session.user.id,
    adminNote: body.adminNote,
  });

  if (!updated) {
    return NextResponse.json({ error: "فشل الموافقة على الطلب" }, { status: 500 });
  }

  const gamification = await awardReferralPoints(referrerUserId, id);

  return NextResponse.json({ success: true, request: updated, gamification });
}
