import { prisma, generateId, toNum } from "./client";
import { userHasActivePlatformSubscription } from "./subscriptions";

export type LuckWheelSpinRow = {
  id: string;
  userId: string;
  resultKey: string;
  createdAt: string;
};

export type LuckWheelSpinAdminRow = LuckWheelSpinRow & {
  studentName: string;
  studentEmail: string;
};

export async function createLuckWheelSpin(data: { userId: string; resultKey: string }): Promise<LuckWheelSpinRow> {
  const id = generateId();
  const r = await prisma.luckWheelSpin.create({
    data: { id, user_id: data.userId, result_key: data.resultKey },
  });
  return {
    id: r.id,
    userId: r.user_id,
    resultKey: r.result_key,
    createdAt: r.created_at.toISOString(),
  };
}

export async function listLuckWheelSpinsForUser(userId: string, limit = 10): Promise<LuckWheelSpinRow[]> {
  const safeLimit = Math.min(Math.max(1, limit), 50);
  const rows = await prisma.luckWheelSpin.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: safeLimit,
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    resultKey: r.result_key,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function listLuckWheelSpinsForAdmin(limit = 100): Promise<LuckWheelSpinAdminRow[]> {
  const safeLimit = Math.min(Math.max(1, limit), 500);
  const rows = await prisma.luckWheelSpin.findMany({
    include: { User: true },
    orderBy: { created_at: "desc" },
    take: safeLimit,
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    resultKey: r.result_key,
    createdAt: r.created_at.toISOString(),
    studentName: r.User?.name ?? "",
    studentEmail: r.User?.email ?? "",
  }));
}

export type StoreProductRow = {
  id: string;
  title: string;
  description: string;
  price: number;
  /** تكلفة الوحدة (للأدمن) — تُستخدم في تقدير الربح لكل عملية بيع */
  costPrice: number;
  imageUrl: string | null;
  pdfUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

function mapStoreProduct(r: {
  id: string;
  title: string;
  description: string;
  price: unknown;
  cost_price: unknown;
  image_url: string | null;
  pdf_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
}): StoreProductRow {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    price: toNum(r.price),
    costPrice: toNum(r.cost_price),
    imageUrl: r.image_url,
    pdfUrl: r.pdf_url,
    isActive: r.is_active,
    sortOrder: r.sort_order,
    createdAt: r.created_at.toISOString(),
  };
}

export async function listStoreProductsPublic(): Promise<StoreProductRow[]> {
  try {
    const rows = await prisma.storeProduct.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    });
    return rows.map(mapStoreProduct);
  } catch {
    return [];
  }
}

export async function listStoreProductsAll(): Promise<StoreProductRow[]> {
  const rows = await prisma.storeProduct.findMany({ orderBy: { created_at: "desc" } });
  return rows.map(mapStoreProduct);
}

export async function createStoreProduct(data: {
  title: string;
  description: string;
  price: number;
  cost_price?: number;
  image_url?: string | null;
  pdf_url?: string | null;
  is_active?: boolean;
}): Promise<{ id: string }> {
  const id = generateId();
  const unitCost =
    data.cost_price !== undefined && Number.isFinite(data.cost_price) ? Math.max(0, data.cost_price) : 0;
  await prisma.storeProduct.create({
    data: {
      id,
      title: data.title.trim(),
      description: data.description.trim() || "",
      price: Math.max(0, data.price),
      cost_price: unitCost,
      image_url: data.image_url?.trim() || null,
      pdf_url: data.pdf_url?.trim() || null,
      is_active: data.is_active !== false,
      sort_order: 0,
    },
  });
  return { id };
}

export async function updateStoreProduct(
  id: string,
  data: {
    title?: string;
    description?: string;
    price?: number;
    cost_price?: number;
    image_url?: string | null;
    pdf_url?: string | null;
    is_active?: boolean;
  },
): Promise<void> {
  const pid = id.trim();
  if (!pid) throw new Error("معرّف المنتج مطلوب");
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.price !== undefined) updateData.price = Math.max(0, data.price);
  if (data.cost_price !== undefined) updateData.cost_price = Math.max(0, data.cost_price);
  if (data.image_url !== undefined) updateData.image_url = data.image_url?.trim() || null;
  if (data.pdf_url !== undefined) updateData.pdf_url = data.pdf_url?.trim() || null;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  if (Object.keys(updateData).length === 0) return;
  updateData.updated_at = new Date();
  await prisma.storeProduct.update({ where: { id: pid }, data: updateData });
}

export async function deleteStoreProduct(id: string): Promise<void> {
  await prisma.storeProduct.deleteMany({ where: { id: id.trim() } });
}

export type StudentStorePurchaseRow = {
  purchaseId: string;
  productId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  pdfUrl: string | null;
  pricePaid: number;
  createdAt: string;
};

export type AdminStorePurchaseRow = {
  purchaseId: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  productId: string;
  productTitle: string;
  pricePaid: number;
  createdAt: string;
};

export type StoreProductProfitRow = {
  productId: string;
  productTitle: string;
  unitsSold: number;
  revenue: number;
  costTotal: number;
  profit: number;
};

export type StoreSalesStats = {
  purchasesCount: number;
  buyersCount: number;
  soldProductsCount: number;
  revenue: number;
  /** مجموع (تكلفة الوحدة × عدد القطع المباعة) حسب آخر تكلفة مسجّلة للمنتج */
  totalCost: number;
  /** مجموع (السعر المدفوع − تكلفة الوحدة) لكل عملية شراء */
  totalProfit: number;
  /** نسبة الربح إلى الإيراد (%)، أو null عند عدم وجود إيراد */
  profitMarginPercent: number | null;
  byProduct: StoreProductProfitRow[];
};

export async function listStudentStorePurchases(userId: string): Promise<StudentStorePurchaseRow[]> {
  try {
    const rows = await prisma.userStorePurchase.findMany({
      where: { user_id: userId },
      include: { StoreProduct: true },
      orderBy: { created_at: "desc" },
    });
    return rows.map((r) => ({
      purchaseId: r.id,
      productId: r.product_id,
      title: r.StoreProduct?.title ?? "",
      description: r.StoreProduct?.description ?? "",
      imageUrl: r.StoreProduct?.image_url ?? null,
      pdfUrl: r.StoreProduct?.pdf_url ?? null,
      pricePaid: toNum(r.price_paid),
      createdAt: r.created_at.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function listStorePurchasesForAdmin(): Promise<AdminStorePurchaseRow[]> {
  try {
    const rows = await prisma.userStorePurchase.findMany({
      include: { User: true, StoreProduct: true },
      orderBy: { created_at: "desc" },
    });
    return rows.map((r) => ({
      purchaseId: r.id,
      userId: r.user_id,
      studentName: r.User?.name ?? "",
      studentEmail: r.User?.email ?? "",
      productId: r.product_id,
      productTitle: r.StoreProduct?.title ?? "",
      pricePaid: toNum(r.price_paid),
      createdAt: r.created_at.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function getStoreSalesStats(): Promise<StoreSalesStats> {
  try {
    const rows = await prisma.userStorePurchase.findMany({
      include: { StoreProduct: { select: { id: true, title: true, cost_price: true } } },
    });

    const buyerIds = new Set<string>();
    const productIds = new Set<string>();
    let revenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    const byProductMap = new Map<string, StoreProductProfitRow>();

    for (const r of rows) {
      buyerIds.add(r.user_id);
      productIds.add(r.product_id);
      const paid = toNum(r.price_paid);
      const cost = toNum(r.StoreProduct?.cost_price ?? 0);
      const profit = paid - cost;
      revenue += paid;
      totalCost += cost;
      totalProfit += profit;

      const existing = byProductMap.get(r.product_id) ?? {
        productId: r.product_id,
        productTitle: r.StoreProduct?.title ?? "",
        unitsSold: 0,
        revenue: 0,
        costTotal: 0,
        profit: 0,
      };
      existing.unitsSold += 1;
      existing.revenue += paid;
      existing.costTotal += cost;
      existing.profit += profit;
      byProductMap.set(r.product_id, existing);
    }

    const byProduct = Array.from(byProductMap.values()).sort(
      (a, b) => b.profit - a.profit || b.revenue - a.revenue,
    );
    const profitMarginPercent = revenue > 0 ? (totalProfit / revenue) * 100 : null;

    return {
      purchasesCount: rows.length,
      buyersCount: buyerIds.size,
      soldProductsCount: productIds.size,
      revenue,
      totalCost,
      totalProfit,
      profitMarginPercent,
      byProduct,
    };
  } catch {
    return {
      purchasesCount: 0,
      buyersCount: 0,
      soldProductsCount: 0,
      revenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMarginPercent: null,
      byProduct: [],
    };
  }
}

export async function deleteStorePurchaseById(purchaseId: string): Promise<void> {
  await prisma.userStorePurchase.deleteMany({ where: { id: purchaseId.trim() } });
}

export async function buyStoreProduct(
  userId: string,
  productId: string,
): Promise<{ purchased: boolean; alreadyOwned: boolean }> {
  const uid = userId.trim();
  const pid = productId.trim();
  if (!uid || !pid) throw new Error("بيانات غير صالحة");

  const existing = await prisma.userStorePurchase.findFirst({
    where: { user_id: uid, product_id: pid },
    select: { id: true },
  });
  if (existing) return { purchased: true, alreadyOwned: true };

  const product = await prisma.storeProduct.findUnique({ where: { id: pid } });
  if (!product?.id || !product.is_active) throw new Error("المنتج غير متاح");
  const price = toNum(product.price);

  const subActive = await userHasActivePlatformSubscription(uid);
  const payable = subActive ? 0 : Math.max(0, price);

  await prisma.$transaction(async (tx) => {
    if (payable > 0) {
      const user = await tx.user.findUnique({ where: { id: uid } });
      if (!user) throw new Error("المستخدم غير موجود");
      const bal = toNum(user.balance);
      if (bal < payable) throw new Error("رصيدك غير كافٍ لشراء هذا المنتج");
      await tx.user.update({
        where: { id: uid },
        data: { balance: String(Math.max(0, bal - payable)), updated_at: new Date() },
      });
    }
    await tx.userStorePurchase.upsert({
      where: { user_id_product_id: { user_id: uid, product_id: pid } },
      create: { id: generateId(), user_id: uid, product_id: pid, price_paid: payable },
      update: {},
    });
  });

  return { purchased: true, alreadyOwned: false };
}
