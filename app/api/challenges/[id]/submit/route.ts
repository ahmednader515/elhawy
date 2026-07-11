import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getChallengeById,
  getChallengeSubmission,
  insertChallengeSubmission,
} from "@/lib/db";
import {
  awardChallengePoints,
  gradeChallengeAnswer,
} from "@/lib/gamification";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id: challengeId } = await context.params;
  let body: { answer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const answer = String(body.answer ?? "").trim();
  if (!answer) {
    return NextResponse.json({ error: "الإجابة مطلوبة" }, { status: 400 });
  }

  const challenge = await getChallengeById(challengeId);
  if (!challenge || !challenge.isActive) {
    return NextResponse.json({ error: "التحدي غير موجود" }, { status: 404 });
  }

  const existing = await getChallengeSubmission(session.user.id, challengeId);
  if (existing) {
    return NextResponse.json({ error: "لقد أجبت على هذا التحدي مسبقاً" }, { status: 409 });
  }

  const isCorrect = gradeChallengeAnswer(challenge.questionType, answer, challenge.correctAnswer);
  const submission = await insertChallengeSubmission({
    userId: session.user.id,
    challengeId,
    answer,
    isCorrect,
  });

  if (!submission) {
    return NextResponse.json({ error: "فشل حفظ الإجابة" }, { status: 500 });
  }

  let gamification = null;
  if (isCorrect) {
    gamification = await awardChallengePoints(session.user.id, challengeId);
  }

  return NextResponse.json({
    success: true,
    isCorrect,
    submission,
    gamification,
  });
}
