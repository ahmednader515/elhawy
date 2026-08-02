import { prisma, generateId, toNum, toStr } from "./client";
import { getUserById } from "./users";
import type { SubscriptionDurationKind } from "@/lib/types";

export type SubscriptionPlanPublic = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  durationKind: SubscriptionDurationKind;
  price: number;
};

export type SubscriptionPlanAdmin = SubscriptionPlanPublic & { isActive: boolean };

function addSubscriptionDuration(from: Date, kind: SubscriptionDurationKind): Date {
  const d = new Date(from.getTime());
  if (kind === "week") d.setUTCDate(d.getUTCDate() + 7);
  else if (kind === "month") d.setUTCDate(d.getUTCDate() + 30);
  else d.setUTCDate(d.getUTCDate() + 365);
  return d;
}

export async function listActiveSubscriptionPlansPublic(): Promise<SubscriptionPlanPublic[]> {
  try {
    const rows = await prisma.subscriptionPlan.findMany({
      where: { is_active: true },
      orderBy: { created_at: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: r.image_url,
      durationKind: r.duration_kind as SubscriptionDurationKind,
      price: toNum(r.price),
    }));
  } catch {
    return [];
  }
}

export async function listSubscriptionPlansAll(): Promise<SubscriptionPlanAdmin[]> {
  const rows = await prisma.subscriptionPlan.findMany({ orderBy: { created_at: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    imageUrl: r.image_url,
    durationKind: r.duration_kind as SubscriptionDurationKind,
    price: toNum(r.price),
    isActive: r.is_active,
  }));
}

export async function createSubscriptionPlan(data: {
  name: string;
  description: string;
  image_url: string | null;
  duration_kind: SubscriptionDurationKind;
  price: number;
  is_active?: boolean;
}): Promise<{ id: string }> {
  const id = generateId();
  const dk = data.duration_kind;
  if (dk !== "week" && dk !== "month" && dk !== "year") throw new Error("مدة غير صالحة");
  await prisma.subscriptionPlan.create({
    data: {
      id,
      name: data.name.trim(),
      description: data.description.trim() || "",
      image_url: data.image_url?.trim() || null,
      duration_kind: dk,
      price: Math.max(0, data.price),
      is_active: data.is_active !== false,
      sort_order: 0,
    },
  });
  return { id };
}

export async function updateSubscriptionPlan(
  id: string,
  data: {
    name?: string;
    description?: string;
    image_url?: string | null;
    duration_kind?: SubscriptionDurationKind;
    price?: number;
    is_active?: boolean;
  },
): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.image_url !== undefined) updateData.image_url = data.image_url?.trim() || null;
  if (data.duration_kind !== undefined) {
    const dk = data.duration_kind;
    if (dk !== "week" && dk !== "month" && dk !== "year") throw new Error("مدة غير صالحة");
    updateData.duration_kind = dk;
  }
  if (data.price !== undefined) updateData.price = Math.max(0, data.price);
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  if (Object.keys(updateData).length === 0) return;
  updateData.updated_at = new Date();
  await prisma.subscriptionPlan.update({ where: { id }, data: updateData });
}

export async function deleteSubscriptionPlan(id: string): Promise<void> {
  await prisma.subscriptionPlan.deleteMany({ where: { id } });
}

export async function getSubscriptionPlanById(id: string): Promise<{
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  duration_kind: SubscriptionDurationKind;
  price: number;
  is_active: boolean;
} | null> {
  const r = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    image_url: r.image_url,
    duration_kind: r.duration_kind as SubscriptionDurationKind,
    price: toNum(r.price),
    is_active: r.is_active,
  };
}

/** هل للمستخدم اشتراك منصة نشط (أي وقت انتهاء في المستقبل) */
export async function userHasActivePlatformSubscription(userId: string): Promise<boolean> {
  try {
    const found = await prisma.userPlatformSubscription.findFirst({
      where: { user_id: userId, expires_at: { gt: new Date() } },
      select: { id: true },
    });
    return !!found;
  } catch {
    return false;
  }
}

/** اشتراك نشط + دورة منشورة + سعرها > 0 ⇒ وصول كامل كمسجّل */
export async function userHasActivePlatformSubscriptionForPaidCourse(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const active = await userHasActivePlatformSubscription(userId);
  if (!active) return false;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return false;
  if (!course.is_published) return false;
  const price = toNum(course.price);
  return price > 0;
}

/** تسجيل في الدورة أو اشتراك منصة نشط على دورة مدفوعة منشورة */
export async function hasFullCourseAccessAsStudent(userId: string, courseId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { user_id: userId, course_id: courseId },
    select: { id: true },
  });
  if (enrollment) return true;
  return userHasActivePlatformSubscriptionForPaidCourse(userId, courseId);
}

export async function getLatestPlatformSubscriptionExpiry(userId: string): Promise<Date | null> {
  try {
    const agg = await prisma.userPlatformSubscription.aggregate({
      where: { user_id: userId, expires_at: { gt: new Date() } },
      _max: { expires_at: true },
    });
    return agg._max.expires_at ?? null;
  } catch {
    return null;
  }
}

export async function purchasePlatformSubscription(userId: string, planId: string): Promise<{ expiresAt: Date }> {
  const plan = await getSubscriptionPlanById(planId);
  if (!plan || !plan.is_active) throw new Error("الباقة غير متاحة");
  const price = plan.price;
  const user = await getUserById(userId);
  if (!user) throw new Error("المستخدم غير موجود");
  if (user.role !== "STUDENT") throw new Error("الاشتراك متاح للطلاب فقط");

  if (await userHasActivePlatformSubscription(userId)) {
    const exp = await getLatestPlatformSubscriptionExpiry(userId);
    const expLine = exp
      ? `ينتهي اشتراكك الحالي في ${new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(exp)}. `
      : "";
    throw new Error(
      `${expLine}أنت مشترك في المنصة بالفعل ولا تحتاج لدفع مرة أخرى إلا بعد انتهاء هذه المدة.`,
    );
  }

  const balance = toNum(user.balance);
  if (price > 0 && balance < price) throw new Error("رصيدك غير كافٍ لشراء هذه الباقة");

  const now = new Date();
  const expiresAt = addSubscriptionDuration(now, plan.duration_kind);
  const subId = generateId();

  await prisma.$transaction(async (tx) => {
    if (price > 0) {
      const newBal = toStr(Math.max(0, balance - price));
      await tx.user.update({ where: { id: userId }, data: { balance: newBal, updated_at: new Date() } });
    }
    await tx.userPlatformSubscription.create({
      data: {
        id: subId,
        user_id: userId,
        plan_id: planId,
        price_paid: price,
        expires_at: expiresAt,
      },
    });
  });

  return { expiresAt };
}

export type PlatformSubscriptionAdminRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string | null;
  planName: string | null;
  pricePaid: number;
  expiresAtIso: string;
  createdAtIso: string;
  isActive: boolean;
};

/** سجلات اشتراك المنصة للطلاب — للأدمن (مع بيانات الطالب والباقة) */
export async function listUserPlatformSubscriptionsForAdmin(): Promise<PlatformSubscriptionAdminRow[]> {
  try {
    const rows = await prisma.userPlatformSubscription.findMany({
      include: { User: true, SubscriptionPlan: true },
      orderBy: [{ expires_at: "desc" }, { created_at: "desc" }],
    });
    const now = Date.now();
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.User?.name ?? "",
      userEmail: r.User?.email ?? "",
      planId: r.plan_id ?? null,
      planName: r.SubscriptionPlan?.name ?? null,
      pricePaid: toNum(r.price_paid),
      expiresAtIso: r.expires_at.toISOString(),
      createdAtIso: r.created_at.toISOString(),
      isActive: r.expires_at.getTime() > now,
    }));
  } catch {
    return [];
  }
}

export async function updateUserPlatformSubscriptionExpiresAt(id: string, expiresAt: Date): Promise<void> {
  const found = await prisma.userPlatformSubscription.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new Error("سجل الاشتراك غير موجود");
  await prisma.userPlatformSubscription.update({ where: { id }, data: { expires_at: expiresAt } });
}

export async function deleteUserPlatformSubscriptionById(id: string): Promise<void> {
  await prisma.userPlatformSubscription.deleteMany({ where: { id } });
}
