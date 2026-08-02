import { prisma, generateId, sql } from "./client";
import type { Category, UserRole } from "@/lib/types";

/**
 * كان هذا يضيف عمود created_by_id عبر ALTER TABLE عند استخدام SQL الخام.
 * مع Prisma العمود موجود دائماً في المخطط، فلا حاجة لأي فعل — أُبقيت الدالة
 * للحفاظ على توافق الاستدعاءات القديمة فقط.
 */
export async function ensureCategoryCreatedByColumn(): Promise<void> {
  // NO-OP: العمود created_by_id موجود بالفعل في مخطط Prisma.
}

function mapCategory(row: {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  image_url: string | null;
  order: number;
  created_by_id: string | null;
  created_at: Date;
  updated_at: Date;
}): Category {
  /* الحقول camelCase هنا (nameAr, imageUrl, createdAt, updatedAt) لا تطابق حرفياً
     تسمية Category في lib/types (name_ar, image_url, ...) — هذا يطابق سلوك
     rowToCamel القديم الذي كان يحوّل كل صفوف القاعدة إلى camelCase قبل الإسناد. */
  return {
    id: row.id,
    name: row.name,
    nameAr: row.name_ar,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    order: row.order,
    createdById: row.created_by_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as unknown as Category;
}

export async function getCategories(): Promise<Category[]> {
  const rows = await prisma.category.findMany({ orderBy: { order: "asc" } });
  return rows.map(mapCategory);
}

/** أقسام تظهر في لوحة إنشاء/تعديل الدورة: المدرس يرى أقسامه فقط؛ الأدمن يرى أقسام المنصة وأقسام أي أدمن/مساعد */
export async function getCategoriesForDashboard(userId: string, role: UserRole): Promise<Category[]> {
  if (role === "TEACHER") {
    const rows = await prisma.category.findMany({
      where: { created_by_id: userId },
      orderBy: { order: "asc" },
    });
    return rows.map(mapCategory);
  }
  if (role === "ADMIN" || role === "ASSISTANT_ADMIN") {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "ASSISTANT_ADMIN"] } },
      select: { id: true },
    });
    const adminIds = admins.map((u) => u.id);
    const rows = await prisma.category.findMany({
      where: {
        OR: [{ created_by_id: null }, { created_by_id: { in: adminIds } }],
      },
      orderBy: { order: "asc" },
    });
    return rows.map(mapCategory);
  }
  return [];
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  const row = await prisma.category.findUnique({ where: { id: trimmed } });
  return row ? mapCategory(row) : null;
}

/** هل يحق لهذا المستخدم اختيار هذا القسم أو حذفه من لوحة الدورات؟ */
export async function categoryIsManageableOnDashboard(
  categoryId: string,
  userId: string,
  role: UserRole,
): Promise<boolean> {
  const id = categoryId.trim();
  if (!id) return false;
  if (role === "TEACHER") {
    const found = await prisma.category.findFirst({
      where: { id, created_by_id: userId },
      select: { id: true },
    });
    return !!found;
  }
  if (role === "ADMIN" || role === "ASSISTANT_ADMIN") {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "ASSISTANT_ADMIN"] } },
      select: { id: true },
    });
    const adminIds = admins.map((u) => u.id);
    const found = await prisma.category.findFirst({
      where: {
        id,
        OR: [{ created_by_id: null }, { created_by_id: { in: adminIds } }],
      },
      select: { id: true },
    });
    return !!found;
  }
  return false;
}

export async function createCategory(data: {
  name: string;
  name_ar?: string | null;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  order?: number;
  created_by_id?: string | null;
}): Promise<Category> {
  const id = generateId();
  const row = await prisma.category.create({
    data: {
      id,
      name: data.name,
      name_ar: data.name_ar ?? null,
      slug: data.slug,
      description: data.description ?? null,
      image_url: data.image_url ?? null,
      order: data.order ?? 0,
      created_by_id: data.created_by_id ?? null,
    },
  });
  return mapCategory(row);
}

/** بحث عام بالاسم (بدون تقييد مالك) — للبذرة والأدوات القديمة */
export async function getCategoryByName(name: string): Promise<Category | null> {
  const n = name.trim();
  if (!n) return null;
  const rows = await sql`
    SELECT * FROM "Category"
    WHERE LOWER(TRIM(name)) = LOWER(${n})
       OR (name_ar IS NOT NULL AND LOWER(TRIM(name_ar)) = LOWER(${n}))
    LIMIT 1
  `;
  const row = rows[0] as
    | {
        id: string;
        name: string;
        name_ar: string | null;
        slug: string;
        description: string | null;
        image_url: string | null;
        order: number;
        created_by_id: string | null;
        created_at: Date;
        updated_at: Date;
      }
    | undefined;
  return row ? mapCategory(row) : null;
}

/** مطابقة اسم قسم ضمن أقسام المستخدم في لوحة الدورات فقط */
export async function findCategoryByNameForDashboard(
  name: string,
  userId: string,
  role: UserRole,
): Promise<Category | null> {
  const n = name.trim();
  if (!n) return null;
  if (role === "TEACHER") {
    const rows = await sql`
      SELECT * FROM "Category"
      WHERE created_by_id = ${userId}
        AND (
          LOWER(TRIM(name)) = LOWER(${n})
          OR (name_ar IS NOT NULL AND LOWER(TRIM(name_ar)) = LOWER(${n}))
        )
      LIMIT 1
    `;
    const row = rows[0] as Parameters<typeof mapCategory>[0] | undefined;
    return row ? mapCategory(row) : null;
  }
  if (role === "ADMIN" || role === "ASSISTANT_ADMIN") {
    const rows = await sql`
      SELECT c.* FROM "Category" c
      WHERE (
          LOWER(TRIM(c.name)) = LOWER(${n})
          OR (c.name_ar IS NOT NULL AND LOWER(TRIM(c.name_ar)) = LOWER(${n}))
        )
        AND (
          c.created_by_id IS NULL
          OR EXISTS (
            SELECT 1 FROM "User" u
            WHERE u.id = c.created_by_id
              AND u.role IN ('ADMIN', 'ASSISTANT_ADMIN')
          )
        )
      LIMIT 1
    `;
    const row = rows[0] as Parameters<typeof mapCategory>[0] | undefined;
    return row ? mapCategory(row) : null;
  }
  return null;
}

/** حذف قسم — الدورات المرتبطة به تصبح بدون قسم (category_id = null) */
export async function deleteCategory(id: string): Promise<boolean> {
  const trimmed = id?.trim();
  if (!trimmed) return false;
  await prisma.category.deleteMany({ where: { id: trimmed } });
  return true;
}
