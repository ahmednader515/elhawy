import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createReferralRequest,
  getReferralRequestByUserId,
  studentCanSubmitReferral,
} from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const [request, canSubmit] = await Promise.all([
      getReferralRequestByUserId(session.user.id),
      studentCanSubmitReferral(session.user.id),
    ]);
    return NextResponse.json({ request, canSubmit });
  } catch (e) {
    console.error("API referrals GET:", e);
    return NextResponse.json({ error: "فشل جلب الطلب" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const canSubmit = await studentCanSubmitReferral(session.user.id);
  if (!canSubmit) {
    return NextResponse.json({ error: "يجب أن تكون مشتركاً في المنصة لإرسال طلب الدعوة" }, { status: 403 });
  }

  const existing = await getReferralRequestByUserId(session.user.id);
  if (existing) {
    return NextResponse.json({ error: "لقد أرسلت طلباً مسبقاً" }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const studentName = String(body.studentName ?? "").trim();
  const studentMobile = String(body.studentMobile ?? "").trim();
  const studentEmail = String(body.studentEmail ?? "").trim();
  const referrerName = String(body.referrerName ?? "").trim();
  const referrerMobile = String(body.referrerMobile ?? "").trim();

  if (!studentName || !studentMobile || !studentEmail || !referrerName || !referrerMobile) {
    return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
  }

  const created = await createReferralRequest({
    userId: session.user.id,
    studentName,
    studentMobile,
    studentEmail,
    referrerName,
    referrerMobile,
  });

  if (!created) {
    return NextResponse.json({ error: "فشل إرسال الطلب" }, { status: 500 });
  }

  return NextResponse.json({ success: true, request: created });
}
