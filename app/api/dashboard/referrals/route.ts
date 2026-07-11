import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listReferralRequests, searchStudentsForReferral } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";

  try {
    if (search) {
      const students = await searchStudentsForReferral(search, 15);
      return NextResponse.json({ students });
    }

    const status =
      statusParam === "PENDING" || statusParam === "APPROVED" || statusParam === "REJECTED"
        ? statusParam
        : undefined;
    const requests = await listReferralRequests(status);
    return NextResponse.json({ requests });
  } catch (e) {
    console.error("API dashboard referrals GET:", e);
    return NextResponse.json({ error: "فشل جلب الطلبات" }, { status: 500 });
  }
}
