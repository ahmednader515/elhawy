import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteChallenge, updateChallenge } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const questionType = body.questionType === "TEXT" ? "TEXT" : body.questionType === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : undefined;
  const options = Array.isArray(body.options)
    ? body.options.map((o) => String(o).trim()).filter(Boolean)
    : undefined;

  try {
    const challenge = await updateChallenge(id, {
      title: body.title != null ? String(body.title).trim() : undefined,
      titleEn: body.titleEn !== undefined ? (body.titleEn ? String(body.titleEn).trim() : null) : undefined,
      description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
      descriptionEn: body.descriptionEn !== undefined ? (body.descriptionEn ? String(body.descriptionEn).trim() : null) : undefined,
      questionType,
      options,
      correctAnswer: body.correctAnswer != null ? String(body.correctAnswer).trim() : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) || 0 : undefined,
    });
    if (!challenge) {
      return NextResponse.json({ error: "التحدي غير موجود" }, { status: 404 });
    }
    return NextResponse.json({ success: true, challenge });
  } catch (e) {
    console.error("API dashboard challenges PUT:", e);
    return NextResponse.json({ error: "فشل تحديث التحدي" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  const deleted = await deleteChallenge(id);
  if (!deleted) {
    return NextResponse.json({ error: "التحدي غير موجود" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
