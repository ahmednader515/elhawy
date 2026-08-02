import type { User, UserRole } from "@/lib/types";
import { generateCopyrightCodeCandidate } from "../copyright-code";
import { prisma, generateId, toStr, toNum, sql, Prisma } from "./client";

/** يحوّل صف Prisma/SQL (balance من نوع Decimal) إلى شكل User المتوافق مع lib/types */
function toUser(row: Record<string, unknown>): User {
  return { ...(row as unknown as User), balance: toStr(row.balance) };
}

// ----- User -----
export async function getUserByEmail(email: string): Promise<User | null> {
  const u = await prisma.user.findUnique({ where: { email } });
  return u ? toUser(u) : null;
}

/** تحويل الأرقام العربية ٠-٩ إلى إنجليزية */
function normalizeArabicDigits(s: string): string {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  let out = "";
  for (const c of s) {
    const i = arabic.indexOf(c);
    out += i >= 0 ? String(i) : c;
  }
  return out;
}

/** تسجيل الدخول بالبريد أو رقم الهاتف: إذا القيمة تحتوي @ نبحث بالبريد، وإلا بالرقم (مقارنة بعد حذف غير الأرقام وتوحيد صيغ 0 و 20) */
export async function getUserByEmailOrPhone(emailOrPhone: string): Promise<User | null> {
  const trimmed = emailOrPhone.trim();
  if (trimmed.includes("@")) {
    return getUserByEmail(trimmed);
  }
  const withWesternDigits = normalizeArabicDigits(trimmed);
  const digits = withWesternDigits.replace(/\D/g, "");
  if (digits.length < 10) return null;

  const exactVariants = new Set<string>([trimmed, withWesternDigits, digits]);
  if (digits.startsWith("20") && digits.length === 12) {
    exactVariants.add("0" + digits.slice(2));
    exactVariants.add("+" + digits);
  }
  if (digits.startsWith("0") && digits.length === 11) {
    exactVariants.add("20" + digits.slice(1));
    exactVariants.add("+20" + digits.slice(1));
  }
  if (digits.length === 10) {
    exactVariants.add("0" + digits);
    exactVariants.add("20" + digits);
    exactVariants.add("+20" + digits);
  }
  const variantList = [...exactVariants];

  const exact = await prisma.user.findFirst({
    where: {
      OR: [{ guardian_number: { in: variantList } }, { student_number: { in: variantList } }],
    },
  });
  if (exact) return toUser(exact);

  const matchByDigits = async (norm: string): Promise<User | null> => {
    const rows = await sql`
      SELECT * FROM "User"
      WHERE REGEXP_REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(guardian_number, ''), '٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'), '[^0-9]', '', 'g') = ${norm}
         OR REGEXP_REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(student_number, ''), '٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'), '[^0-9]', '', 'g') = ${norm}
      LIMIT 1
    `;
    const row = rows[0] as Record<string, unknown> | undefined;
    return row ? toUser(row) : null;
  };

  let user = await matchByDigits(digits);
  if (user) return user;
  if (digits.startsWith("20") && digits.length === 12) {
    user = await matchByDigits("0" + digits.slice(2));
    if (user) return user;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    user = await matchByDigits("20" + digits.slice(1));
    if (user) return user;
  }
  if (digits.length === 10) {
    user = await matchByDigits("0" + digits);
    if (user) return user;
  }
  return null;
}

export async function getUserById(id: string): Promise<User | null> {
  const u = await prisma.user.findUnique({ where: { id } });
  return u ? toUser(u) : null;
}

/** رصيد المستخدم فقط — بدون جلب كلمة المرور وباقي الأعمدة */
export async function getUserBalance(id: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id }, select: { balance: true } });
  return toNum(u?.balance) || 0;
}

/** جلسة واحدة نشطة لكل مستخدم — نستخدمها لمنع تسجيل الدخول من أكثر من جهاز */
export async function getCurrentSessionId(userId: string): Promise<string | null> {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { current_session_id: true } });
    return u?.current_session_id ?? null;
  } catch {
    return null;
  }
}

export async function setCurrentSessionId(userId: string, sessionId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { current_session_id: sessionId } });
}

export async function clearCurrentSessionId(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { current_session_id: null } });
}

/**
 * السكيمة الآن يديرها Prisma (prisma/schema.prisma + prisma db push/migrate) —
 * هذه الدوال أصبحت no-op وتبقى فقط للتوافق مع الاستدعاءات القديمة.
 */
export async function ensureTeacherAccountDbSchema(): Promise<void> {}

export async function ensureTeacherHomepageOrderColumn(): Promise<void> {}

export async function ensureCopyrightCodeColumn(): Promise<void> {}

async function copyrightCodeTaken(code: string): Promise<boolean> {
  const existing = await prisma.user.findFirst({ where: { copyright_code: code }, select: { id: true } });
  return !!existing;
}

export async function allocateUniqueCopyrightCode(): Promise<string> {
  for (let i = 0; i < 100; i++) {
    const c = generateCopyrightCodeCandidate();
    if (!(await copyrightCodeTaken(c))) return c;
  }
  throw new Error("تعذر توليد كود حقوق فريد");
}

/** يضمن وجود كود للطالب ويعيده (null لغير الطلاب) */
export async function ensureUserCopyrightCode(userId: string): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, copyright_code: true },
  });
  if (!row || row.role !== "STUDENT") return null;
  const existing = (row.copyright_code ?? "").trim();
  if (existing) return existing;
  const code = await allocateUniqueCopyrightCode();
  await prisma.user.update({ where: { id: userId }, data: { copyright_code: code, updated_at: new Date() } });
  return code;
}

/** تعبئة كود لكل الطلاب الذين بلا كود (ترقية قواعد قديمة) */
export async function backfillMissingStudentCopyrightCodes(): Promise<void> {
  const rows = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      OR: [{ copyright_code: null }, { copyright_code: "" }],
    },
    select: { id: true },
  });
  for (const r of rows) {
    try {
      const code = await allocateUniqueCopyrightCode();
      await prisma.user.update({ where: { id: r.id }, data: { copyright_code: code, updated_at: new Date() } });
    } catch (e) {
      console.error("backfill copyright_code", r.id, e);
    }
  }
}

export async function createUser(data: {
  email: string;
  password_hash: string;
  name: string;
  role?: UserRole;
  student_number?: string | null;
  guardian_number?: string | null;
  teacher_subject?: string | null;
  teacher_avatar_url?: string | null;
}): Promise<User> {
  const id = generateId();
  const role = data.role ?? "STUDENT";
  const studentCopyright = role === "STUDENT" ? await allocateUniqueCopyrightCode() : null;
  const u = await prisma.user.create({
    data: {
      id,
      email: data.email,
      password_hash: data.password_hash,
      name: data.name,
      role,
      student_number: data.student_number ?? null,
      guardian_number: data.guardian_number ?? null,
      teacher_subject: data.teacher_subject ?? null,
      teacher_avatar_url: data.teacher_avatar_url ?? null,
      copyright_code: studentCopyright,
    },
  });
  return toUser(u);
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: UserRole;
    balance?: string;
    password_hash?: string;
    student_number?: string | null;
    guardian_number?: string | null;
    teacher_subject?: string | null;
    teacher_avatar_url?: string | null;
  }
): Promise<void> {
  const update: Prisma.UserUpdateInput = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.email !== undefined) update.email = data.email;
  if (data.role !== undefined) update.role = data.role;
  if (data.balance !== undefined) update.balance = data.balance;
  if (data.password_hash !== undefined) update.password_hash = data.password_hash;
  if (data.student_number !== undefined) update.student_number = data.student_number;
  if (data.guardian_number !== undefined) update.guardian_number = data.guardian_number;
  if (data.teacher_subject !== undefined) update.teacher_subject = data.teacher_subject;
  if (data.teacher_avatar_url !== undefined) update.teacher_avatar_url = data.teacher_avatar_url;
  if (Object.keys(update).length === 0) return;
  update.updated_at = new Date();
  await prisma.user.update({ where: { id }, data: update });
}

// ----- PasswordChangeRequest (طلبات تغيير كلمة المرور) -----
export async function createPasswordChangeRequest(
  userId: string,
  newPasswordHash: string,
  requestedIdentifier?: string | null,
  requestedOldPassword?: string | null,
  requestedNewPasswordPlain?: string | null
): Promise<string> {
  const id = generateId();
  await prisma.passwordChangeRequest.create({
    data: {
      id,
      user_id: userId,
      new_password_hash: newPasswordHash,
      requested_identifier: requestedIdentifier ?? null,
      requested_old_password: requestedOldPassword ?? null,
      requested_new_password_plain: requestedNewPasswordPlain ?? null,
      status: "pending",
    },
  });
  return id;
}

export async function getPasswordChangeRequests(): Promise<
  Array<{
    id: string;
    userId: string;
    newPasswordHash: string;
    requestedIdentifier: string | null;
    requestedOldPassword: string | null;
    requestedNewPasswordPlain: string | null;
    status: string;
    createdAt: Date;
    processedAt: Date | null;
    processedById: string | null;
    userEmail: string;
    userName: string;
  }>
> {
  const rows = await prisma.passwordChangeRequest.findMany({
    orderBy: { created_at: "desc" },
    include: {
      User_PasswordChangeRequest_user_idToUser: { select: { email: true, name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    newPasswordHash: r.new_password_hash,
    requestedIdentifier: r.requested_identifier ?? null,
    requestedOldPassword: r.requested_old_password ?? null,
    requestedNewPasswordPlain: r.requested_new_password_plain ?? null,
    status: r.status,
    createdAt: r.created_at,
    processedAt: r.processed_at ?? null,
    processedById: r.processed_by_id ?? null,
    userEmail: r.User_PasswordChangeRequest_user_idToUser?.email ?? "",
    userName: r.User_PasswordChangeRequest_user_idToUser?.name ?? "",
  }));
}

export async function getPasswordChangeRequestById(requestId: string): Promise<{
  id: string;
  userId: string;
  newPasswordHash: string;
  status: string;
} | null> {
  const r = await prisma.passwordChangeRequest.findUnique({
    where: { id: requestId },
    select: { id: true, user_id: true, new_password_hash: true, status: true },
  });
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    newPasswordHash: r.new_password_hash,
    status: r.status,
  };
}

export async function completePasswordChangeRequest(requestId: string, processedByUserId: string): Promise<boolean> {
  const req = await getPasswordChangeRequestById(requestId);
  if (!req || req.status !== "pending") return false;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.userId },
      data: { password_hash: req.newPasswordHash, updated_at: new Date() },
    }),
    prisma.passwordChangeRequest.update({
      where: { id: requestId },
      data: { status: "completed", processed_at: new Date(), processed_by_id: processedByUserId },
    }),
  ]);
  return true;
}

export async function deletePasswordChangeRequest(requestId: string): Promise<boolean> {
  if (!requestId?.trim()) return false;
  await prisma.passwordChangeRequest.deleteMany({ where: { id: requestId.trim() } });
  return true;
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const rows = await prisma.user.findMany({ where: { role }, orderBy: { created_at: "desc" } });
  return rows.map(toUser);
}

/** حذف حساب مدرس — يتحقق من الرتبة قبل الحذف (دوراته تبقى مع created_by_id = null إن كان القيد كذلك في قاعدة البيانات) */
export async function deleteTeacherUser(userId: string): Promise<void> {
  const u = await getUserById(userId);
  if (!u) throw new Error("المستخدم غير موجود");
  if (u.role !== "TEACHER") throw new Error("يمكن حذف حسابات المدرسين فقط");
  await prisma.user.delete({ where: { id: userId } });
}

/** طلاب لديهم تسجيل في أي كورس أنشأه المدرس */
export async function getStudentsEnrolledInTeacherCourses(teacherId: string): Promise<User[]> {
  const rows = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      Enrollment: { some: { Course: { created_by_id: teacherId } } },
    },
    orderBy: { name: "asc" },
  });
  return rows.map(toUser);
}

export async function getUserByEmailExcludingId(email: string, excludeUserId: string): Promise<User | null> {
  const u = await prisma.user.findFirst({ where: { email, id: { not: excludeUserId } } });
  return u ? toUser(u) : null;
}

// ----- Counts -----
export async function countUsersByRole(role: UserRole): Promise<number> {
  return prisma.user.count({ where: { role } });
}
