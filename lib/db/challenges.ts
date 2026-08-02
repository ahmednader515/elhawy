import { prisma, generateId } from "./client";
import type { Challenge as PrismaChallenge, ChallengeSubmission as PrismaChallengeSubmission } from "@prisma/client";

export type ChallengeRow = {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  questionType: "MULTIPLE_CHOICE" | "TEXT";
  options: string[];
  correctAnswer: string;
  isActive: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChallengeSubmissionRow = {
  id: string;
  userId: string;
  challengeId: string;
  answer: string;
  isCorrect: boolean;
  submittedAt: string;
};

export type ReferralRequestRow = {
  id: string;
  userId: string;
  studentName: string;
  studentMobile: string;
  studentEmail: string;
  referrerName: string;
  referrerMobile: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  matchedReferrerUserId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNote: string | null;
  createdAt: string;
  studentUserName?: string;
  studentUserEmail?: string;
  matchedReferrerName?: string | null;
};

type ReferralRequestWithRelations = {
  id: string;
  user_id: string;
  student_name: string;
  student_mobile: string;
  student_email: string;
  referrer_name: string;
  referrer_mobile: string;
  status: string;
  matched_referrer_user_id: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  admin_note: string | null;
  created_at: Date;
  User_ReferralRequest_user_idToUser?: { name: string; email: string } | null;
  User_ReferralRequest_matched_referrer_user_idToUser?: { name: string } | null;
};

function mapChallengeRow(row: PrismaChallenge): ChallengeRow {
  let options: string[] = [];
  const rawOptions = row.options;
  if (Array.isArray(rawOptions)) {
    options = rawOptions.map(String);
  }
  return {
    id: row.id,
    title: row.title,
    titleEn: row.title_en,
    description: row.description,
    descriptionEn: row.description_en,
    questionType: row.question_type === "TEXT" ? "TEXT" : "MULTIPLE_CHOICE",
    options,
    correctAnswer: row.correct_answer,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapChallengeSubmission(row: PrismaChallengeSubmission): ChallengeSubmissionRow {
  return {
    id: row.id,
    userId: row.user_id,
    challengeId: row.challenge_id,
    answer: row.answer,
    isCorrect: row.is_correct,
    submittedAt: row.submitted_at.toISOString(),
  };
}

function mapReferralRow(row: ReferralRequestWithRelations): ReferralRequestRow {
  return {
    id: row.id,
    userId: row.user_id,
    studentName: row.student_name ?? "",
    studentMobile: row.student_mobile ?? "",
    studentEmail: row.student_email ?? "",
    referrerName: row.referrer_name ?? "",
    referrerMobile: row.referrer_mobile ?? "",
    status: (row.status === "APPROVED" || row.status === "REJECTED" ? row.status : "PENDING") as ReferralRequestRow["status"],
    matchedReferrerUserId: row.matched_referrer_user_id,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? row.reviewed_at.toISOString() : null,
    adminNote: row.admin_note,
    createdAt: row.created_at.toISOString(),
    studentUserName: row.User_ReferralRequest_user_idToUser?.name,
    studentUserEmail: row.User_ReferralRequest_user_idToUser?.email,
    matchedReferrerName: row.User_ReferralRequest_matched_referrer_user_idToUser?.name ?? null,
  };
}

const REFERRAL_INCLUDE = {
  User_ReferralRequest_user_idToUser: { select: { name: true, email: true } },
  User_ReferralRequest_matched_referrer_user_idToUser: { select: { name: true } },
} as const;

// ----- Challenges -----

export async function studentCanSubmitReferral(userId: string): Promise<boolean> {
  const enrollmentCount = await prisma.enrollment.count({ where: { user_id: userId } });
  if (enrollmentCount > 0) return true;
  const activeSubCount = await prisma.userPlatformSubscription.count({
    where: { user_id: userId, expires_at: { gt: new Date() } },
  });
  return activeSubCount > 0;
}

export async function listActiveChallenges(): Promise<ChallengeRow[]> {
  const rows = await prisma.challenge.findMany({
    where: { is_active: true },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
  });
  return rows.map(mapChallengeRow);
}

export async function listAllChallenges(): Promise<ChallengeRow[]> {
  const rows = await prisma.challenge.findMany({
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
  });
  return rows.map(mapChallengeRow);
}

export async function getChallengeById(id: string): Promise<ChallengeRow | null> {
  const row = await prisma.challenge.findUnique({ where: { id } });
  return row ? mapChallengeRow(row) : null;
}

export async function createChallenge(data: {
  title: string;
  titleEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  questionType: "MULTIPLE_CHOICE" | "TEXT";
  options?: string[];
  correctAnswer: string;
  isActive?: boolean;
  sortOrder?: number;
  createdBy?: string | null;
}): Promise<ChallengeRow> {
  const created = await prisma.challenge.create({
    data: {
      id: generateId(),
      title: data.title.trim(),
      title_en: data.titleEn?.trim() || null,
      description: data.description?.trim() || null,
      description_en: data.descriptionEn?.trim() || null,
      question_type: data.questionType,
      options: data.options ?? [],
      correct_answer: data.correctAnswer.trim(),
      is_active: data.isActive !== false,
      sort_order: data.sortOrder ?? 0,
      created_by: data.createdBy ?? null,
    },
  });
  return mapChallengeRow(created);
}

export async function updateChallenge(
  id: string,
  data: Partial<{
    title: string;
    titleEn: string | null;
    description: string | null;
    descriptionEn: string | null;
    questionType: "MULTIPLE_CHOICE" | "TEXT";
    options: string[];
    correctAnswer: string;
    isActive: boolean;
    sortOrder: number;
  }>,
): Promise<ChallengeRow | null> {
  const existing = await getChallengeById(id);
  if (!existing) return null;

  const title = data.title?.trim() ?? existing.title;
  const titleEn = data.titleEn !== undefined ? data.titleEn?.trim() || null : existing.titleEn;
  const description = data.description !== undefined ? data.description?.trim() || null : existing.description;
  const descriptionEn = data.descriptionEn !== undefined ? data.descriptionEn?.trim() || null : existing.descriptionEn;
  const questionType = data.questionType ?? existing.questionType;
  const options = data.options ?? existing.options;
  const correctAnswer = data.correctAnswer?.trim() ?? existing.correctAnswer;
  const isActive = data.isActive ?? existing.isActive;
  const sortOrder = data.sortOrder ?? existing.sortOrder;

  const updated = await prisma.challenge.update({
    where: { id },
    data: {
      title,
      title_en: titleEn,
      description,
      description_en: descriptionEn,
      question_type: questionType,
      options,
      correct_answer: correctAnswer,
      is_active: isActive,
      sort_order: sortOrder,
      updated_at: new Date(),
    },
  });
  return mapChallengeRow(updated);
}

export async function deleteChallenge(id: string): Promise<boolean> {
  const result = await prisma.challenge.deleteMany({ where: { id } });
  return result.count > 0;
}

export async function getChallengeSubmission(
  userId: string,
  challengeId: string,
): Promise<ChallengeSubmissionRow | null> {
  const row = await prisma.challengeSubmission.findUnique({
    where: { user_id_challenge_id: { user_id: userId, challenge_id: challengeId } },
  });
  return row ? mapChallengeSubmission(row) : null;
}

export async function listChallengeSubmissionsForUser(userId: string): Promise<ChallengeSubmissionRow[]> {
  const rows = await prisma.challengeSubmission.findMany({ where: { user_id: userId } });
  return rows.map(mapChallengeSubmission);
}

export async function insertChallengeSubmission(data: {
  userId: string;
  challengeId: string;
  answer: string;
  isCorrect: boolean;
}): Promise<ChallengeSubmissionRow | null> {
  try {
    const created = await prisma.challengeSubmission.create({
      data: {
        id: generateId(),
        user_id: data.userId,
        challenge_id: data.challengeId,
        answer: data.answer,
        is_correct: data.isCorrect,
      },
    });
    return mapChallengeSubmission(created);
  } catch {
    return null;
  }
}

// ----- Referrals -----

export async function getReferralRequestByUserId(userId: string): Promise<ReferralRequestRow | null> {
  const row = await prisma.referralRequest.findUnique({
    where: { user_id: userId },
    include: REFERRAL_INCLUDE,
  });
  return row ? mapReferralRow(row) : null;
}

export async function getReferralRequestById(id: string): Promise<ReferralRequestRow | null> {
  const row = await prisma.referralRequest.findUnique({
    where: { id },
    include: REFERRAL_INCLUDE,
  });
  return row ? mapReferralRow(row) : null;
}

export async function createReferralRequest(data: {
  userId: string;
  studentName: string;
  studentMobile: string;
  studentEmail: string;
  referrerName: string;
  referrerMobile: string;
}): Promise<ReferralRequestRow | null> {
  const id = generateId();
  try {
    await prisma.referralRequest.create({
      data: {
        id,
        user_id: data.userId,
        student_name: data.studentName.trim(),
        student_mobile: data.studentMobile.trim(),
        student_email: data.studentEmail.trim(),
        referrer_name: data.referrerName.trim(),
        referrer_mobile: data.referrerMobile.trim(),
        status: "PENDING",
      },
    });
    return getReferralRequestById(id);
  } catch {
    return null;
  }
}

export async function listReferralRequests(status?: "PENDING" | "APPROVED" | "REJECTED"): Promise<ReferralRequestRow[]> {
  const rows = await prisma.referralRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { created_at: "desc" },
    include: REFERRAL_INCLUDE,
  });
  return rows.map(mapReferralRow);
}

export async function approveReferralRequest(data: {
  id: string;
  referrerUserId: string;
  reviewedBy: string;
  adminNote?: string | null;
}): Promise<ReferralRequestRow | null> {
  const existing = await getReferralRequestById(data.id);
  if (!existing || existing.status !== "PENDING") return null;

  await prisma.referralRequest.updateMany({
    where: { id: data.id, status: "PENDING" },
    data: {
      status: "APPROVED",
      matched_referrer_user_id: data.referrerUserId,
      reviewed_by: data.reviewedBy,
      reviewed_at: new Date(),
      admin_note: data.adminNote?.trim() || null,
    },
  });
  return getReferralRequestById(data.id);
}

export async function rejectReferralRequest(data: {
  id: string;
  reviewedBy: string;
  adminNote?: string | null;
}): Promise<ReferralRequestRow | null> {
  const existing = await getReferralRequestById(data.id);
  if (!existing || existing.status !== "PENDING") return null;

  await prisma.referralRequest.updateMany({
    where: { id: data.id, status: "PENDING" },
    data: {
      status: "REJECTED",
      reviewed_by: data.reviewedBy,
      reviewed_at: new Date(),
      admin_note: data.adminNote?.trim() || null,
    },
  });
  return getReferralRequestById(data.id);
}

export async function searchStudentsForReferral(
  query: string,
  limit = 10,
): Promise<Array<{ id: string; name: string; email: string }>> {
  const q = query.trim();
  if (!q) return [];
  const rows = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }],
    },
    orderBy: { name: "asc" },
    take: limit,
    select: { id: true, name: true, email: true },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email }));
}
