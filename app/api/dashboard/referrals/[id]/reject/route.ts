import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getReferralRequestById, rejectReferralRequest } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  let body: { adminNote?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const existing = await getReferralRequestById(id);
  if (!existing || existing.status !== "PENDING") {
    return NextResponse.json({ error: "الطلب غير موجود أو تمت مراجعته" }, { status: 404 });
  }

  const updated = await rejectReferralRequest({
    id,
    reviewedBy: session.user.id,
    adminNote: body.adminNote,
  });

  if (!updated) {
    return NextResponse.json({ error: "فشل رفض الطلب" }, { status: 500 });
  }

  return NextResponse.json({ success: true, request: updated });
}
