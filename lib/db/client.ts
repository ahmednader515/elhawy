import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL غير معرّف");

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** عميل Prisma — اتصال PostgreSQL عبر DATABASE_URL (Hostinger VPS أو أي Postgres) */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** توليد معرّف فريد متوافق مع CUID (نفس صيغة المعرّفات القديمة) */
export function generateId(): string {
  const part = () => Math.random().toString(36).slice(2, 10);
  return "c" + part() + part() + Date.now().toString(36).slice(-6);
}

/** تحويل قيمة (خصوصاً Prisma.Decimal) إلى رقم JS */
export function toNum(value: unknown): number {
  if (value == null) return 0;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** تحويل قيمة (خصوصاً Prisma.Decimal) إلى نص — لتوافق حقول السعر مع الأنواع القديمة (string) */
export function toStr(value: unknown): string {
  if (value == null) return "0";
  if (value instanceof Prisma.Decimal) return value.toString();
  return String(value);
}

function isReturningQuery(query: string): boolean {
  const q = query.trim().toUpperCase();
  return (
    q.startsWith("SELECT") ||
    q.startsWith("WITH") ||
    q.includes(" RETURNING ") ||
    q.endsWith(" RETURNING") ||
    /RETURNING\s+\*?/.test(q)
  );
}

/**
 * توافق مع واجهة الاستعلامات الخام السابقة (tagged template + sql(query, params[])).
 * يستخدم Prisma $queryRaw / $executeRaw. يُستخدم فقط عند تعذّر التعبير بـ Prisma ORM مباشرة.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sql(
  stringsOrQuery: TemplateStringsArray | string,
  ...values: unknown[]
): Promise<any[]> {
  if (typeof stringsOrQuery === "string") {
    const params = (Array.isArray(values[0]) ? values[0] : values) as unknown[];
    if (isReturningQuery(stringsOrQuery)) {
      return (await prisma.$queryRawUnsafe(stringsOrQuery, ...params)) as any[];
    }
    await prisma.$executeRawUnsafe(stringsOrQuery, ...params);
    return [];
  }

  const head = (stringsOrQuery[0] ?? "").trim().toUpperCase();
  const fullPreview = stringsOrQuery.join(" ").toUpperCase();
  const wantsRows =
    head.startsWith("SELECT") ||
    head.startsWith("WITH") ||
    fullPreview.includes(" RETURNING ");

  if (wantsRows) {
    return (await prisma.$queryRaw(stringsOrQuery, ...values)) as any[];
  }
  await prisma.$executeRaw(stringsOrQuery, ...values);
  return [];
}

export { Prisma };
