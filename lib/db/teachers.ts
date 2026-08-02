import { prisma } from "./client";

/** تفعيل عرض «اختر المدرسين» وحسابات المدرسين */
export async function getTeachersFeatureEnabled(): Promise<boolean> {
  try {
    const row = await prisma.homepageSetting.findUnique({
      where: { id: "default" },
      select: { teachers_enabled: true },
    });
    return !!row?.teachers_enabled;
  } catch {
    return false;
  }
}

export async function setTeachersFeatureEnabled(enabled: boolean): Promise<void> {
  await prisma.homepageSetting.upsert({
    where: { id: "default" },
    create: { id: "default", teachers_enabled: enabled },
    update: { teachers_enabled: enabled, updated_at: new Date() },
  });
}

/** مدرسون يظهرون في الصفحة العامة (لهم كورس منشور على الأقل) */
export async function listTeachersPublic(categoryId?: string | null): Promise<
  Array<{ id: string; name: string; teacherSubject: string | null; teacherAvatarUrl: string | null }>
> {
  const cat = categoryId?.trim() || null;
  const rows = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      Course: {
        some: {
          is_published: true,
          ...(cat ? { category_id: cat } : {}),
        },
      },
    },
    select: { id: true, name: true, teacher_subject: true, teacher_avatar_url: true },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name ?? "",
    teacherSubject: r.teacher_subject ?? null,
    teacherAvatarUrl: r.teacher_avatar_url ?? null,
  }));
}

/** دورة منشورة تظهر ضمن بطاقة المدرس العامة */
export type TeacherHomepageCourse = { id: string; slug: string; title: string; titleAr?: string | null };

export type TeacherHomepageRow = {
  id: string;
  name: string;
  teacherSubject: string | null;
  teacherAvatarUrl: string | null;
  createdAt: string;
  /** 1–4 إن حُدّد من لوحة التحكم؛ وإلا null */
  homepageOrder: number | null;
  courses: TeacherHomepageCourse[];
};

export const HOME_TEACHER_PREVIEW_MAX = 4;

/** ترتيب بطاقات الرئيسية: المحددون بالترتيب 1–4 ثم الباقون أبجدياً، حتى `max` */
export function selectTeachersForHomepagePreview<T extends { id: string; name: string; homepageOrder: number | null }>(
  teachers: T[],
  max: number = HOME_TEACHER_PREVIEW_MAX,
): T[] {
  if (teachers.length === 0) return [];
  const slot = (o: number | null) =>
    o != null && Number.isFinite(o) && o >= 1 && o <= max ? Math.floor(o) : null;
  const featured = [...teachers]
    .filter((t) => slot(t.homepageOrder) != null)
    .sort(
      (a, b) =>
        slot(a.homepageOrder)! - slot(b.homepageOrder)! || String(a.id).localeCompare(String(b.id)),
    );
  const seen = new Set(featured.map((t) => t.id));
  const rest = [...teachers]
    .filter((t) => !seen.has(t.id))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
  return [...featured, ...rest].slice(0, max);
}

/** حفظ المدرسين الظاهرين أولاً في قسم الرئيسية (0–4 معرفات بالترتيب) */
export async function setTeacherHomepageFeaturedSlots(orderedIds: string[]): Promise<void> {
  const cleaned = orderedIds.map((x) => String(x ?? "").trim()).filter(Boolean);
  const unique: string[] = [];
  for (const id of cleaned) {
    if (unique.includes(id)) throw new Error("لا يمكن تكرار نفس المدرس");
    unique.push(id);
  }
  if (unique.length > HOME_TEACHER_PREVIEW_MAX) {
    throw new Error(`لا يزيد عن ${HOME_TEACHER_PREVIEW_MAX} مدرسين في الرئيسية`);
  }
  for (const id of unique) {
    const u = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!u || u.role !== "TEACHER") throw new Error("معرّف مدرس غير صالح");
  }
  await prisma.user.updateMany({
    where: { role: "TEACHER" },
    data: { teacher_homepage_order: null, updated_at: new Date() },
  });
  for (let i = 0; i < unique.length; i++) {
    const ord = i + 1;
    await prisma.user.updateMany({
      where: { id: unique[i], role: "TEACHER" },
      data: { teacher_homepage_order: ord, updated_at: new Date() },
    });
  }
}

/** كل حسابات المدرسين — للصفحة الرئيسية (حتى من دون كورس منشور) + دوراته المنشورة داخل البطاقة */
export async function listTeachersForHomepage(): Promise<TeacherHomepageRow[]> {
  try {
    const users = await prisma.user.findMany({
      where: { role: "TEACHER" },
      select: {
        id: true,
        name: true,
        teacher_subject: true,
        teacher_avatar_url: true,
        created_at: true,
        teacher_homepage_order: true,
      },
      orderBy: { name: "asc" },
    });
    const teachers: TeacherHomepageRow[] = users.map((r) => {
      const n = r.teacher_homepage_order;
      const homepageOrder =
        n != null && Number.isFinite(n) && n >= 1 && n <= HOME_TEACHER_PREVIEW_MAX ? Math.floor(n) : null;
      return {
        id: r.id,
        name: r.name ?? "",
        teacherSubject: r.teacher_subject ?? null,
        teacherAvatarUrl: r.teacher_avatar_url ?? null,
        createdAt: r.created_at.toISOString(),
        homepageOrder,
        courses: [] as TeacherHomepageCourse[],
      };
    });
    if (teachers.length === 0) return [];

    const teacherIds = teachers.map((t) => t.id);
    const courseRows = await prisma.course.findMany({
      where: { is_published: true, created_by_id: { in: teacherIds } },
      select: { id: true, slug: true, title: true, title_ar: true, created_by_id: true },
      orderBy: [{ order: "asc" }, { created_at: "desc" }],
    });
    const byTeacher = new Map<string, TeacherHomepageCourse[]>();
    for (const r of courseRows) {
      const tid = r.created_by_id ?? "";
      if (!tid) continue;
      const titleAr = r.title_ar?.trim() || null;
      const title = r.title?.trim() || "Course";
      const item: TeacherHomepageCourse = { id: r.id, slug: r.slug ?? "", title, titleAr };
      const list = byTeacher.get(tid);
      if (list) list.push(item);
      else byTeacher.set(tid, [item]);
    }
    return teachers.map((t) => ({
      ...t,
      courses: byTeacher.get(t.id) ?? [],
    }));
  } catch {
    return [];
  }
}

/**
 * عند تفعيل «تعدد المدرسين»: معرفات حسابات TEACHER التي يُستبعد دوراتها من القوائم العامة
 * (تُعرض ضمن بطاقة المدرس أو عند ?teacher= فقط).
 */
export async function getTeacherIdsExcludedFromPublicCourseLists(): Promise<Set<string>> {
  const enabled = await getTeachersFeatureEnabled();
  if (!enabled) return new Set();
  try {
    const rows = await prisma.user.findMany({ where: { role: "TEACHER" }, select: { id: true } });
    return new Set(rows.map((r) => r.id));
  } catch {
    return new Set();
  }
}
