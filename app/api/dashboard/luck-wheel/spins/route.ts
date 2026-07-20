import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listLuckWheelSpinsForAdmin } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 100;
  const safeLimit = Number.isFinite(limit) ? limit : 100;

  try {
    const spins = await listLuckWheelSpinsForAdmin(safeLimit);
    return NextResponse.json({ spins });
  } catch (e) {
    console.error("luck-wheel spins GET", e);
    return NextResponse.json(
      { error: "تعذر جلب السجل. نفّذ scripts/add-luck-wheel.sql إن لزم." },
      { status: 500 },
    );
  }
}
