import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listActiveChallenges,
  listChallengeSubmissionsForUser,
} from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const [challenges, submissions] = await Promise.all([
      listActiveChallenges(),
      listChallengeSubmissionsForUser(session.user.id),
    ]);

    const submissionMap = new Map(submissions.map((s) => [s.challengeId, s]));

    return NextResponse.json({
      challenges: challenges.map((c) => ({
        id: c.id,
        title: c.title,
        titleEn: c.titleEn,
        description: c.description,
        descriptionEn: c.descriptionEn,
        questionType: c.questionType,
        options: c.questionType === "MULTIPLE_CHOICE" ? c.options : [],
        submission: submissionMap.get(c.id) ?? null,
      })),
    });
  } catch (e) {
    console.error("API challenges GET:", e);
    return NextResponse.json({ error: "فشل جلب التحديات" }, { status: 500 });
  }
}
