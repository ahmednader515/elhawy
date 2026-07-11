import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createChallenge, listAllChallenges } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const challenges = await listAllChallenges();
    return NextResponse.json({ challenges });
  } catch (e) {
    console.error("API dashboard challenges GET:", e);
    return NextResponse.json({ error: "فشل جلب التحديات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const correctAnswer = String(body.correctAnswer ?? "").trim();
  const questionType = body.questionType === "TEXT" ? "TEXT" : "MULTIPLE_CHOICE";
  const options = Array.isArray(body.options)
    ? body.options.map((o) => String(o).trim()).filter(Boolean)
    : [];

  if (!title || !correctAnswer) {
    return NextResponse.json({ error: "العنوان والإجابة الصحيحة مطلوبان" }, { status: 400 });
  }
  if (questionType === "MULTIPLE_CHOICE" && options.length < 2) {
    return NextResponse.json({ error: "أضف خيارين على الأقل للاختيار المتعدد" }, { status: 400 });
  }

  try {
    const challenge = await createChallenge({
      title,
      titleEn: body.titleEn != null ? String(body.titleEn) : null,
      description: body.description != null ? String(body.description) : null,
      descriptionEn: body.descriptionEn != null ? String(body.descriptionEn) : null,
      questionType,
      options: questionType === "MULTIPLE_CHOICE" ? options : [],
      correctAnswer,
      isActive: body.isActive !== false,
      sortOrder: Number(body.sortOrder ?? 0) || 0,
      createdBy: session.user.id,
    });
    return NextResponse.json({ success: true, challenge });
  } catch (e) {
    console.error("API dashboard challenges POST:", e);
    return NextResponse.json({ error: "فشل إنشاء التحدي" }, { status: 500 });
  }
}
