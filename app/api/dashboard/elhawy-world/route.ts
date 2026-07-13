import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createElhawyWorldVideo,
  listElhawyWorldVideosAll,
  listElhawyWorldVideosPublished,
} from "@/lib/db";
import { getYouTubeVideoId } from "@/lib/youtube";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "STUDENT") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const videos =
      role === "ADMIN" ? await listElhawyWorldVideosAll() : await listElhawyWorldVideosPublished();
    return NextResponse.json({ videos });
  } catch (e) {
    console.error("API dashboard elhawy-world GET:", e);
    return NextResponse.json({ error: "فشل جلب الفيديوهات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const youtubeUrl = String(body.youtubeUrl ?? "").trim();
  if (!title || !youtubeUrl) {
    return NextResponse.json({ error: "العنوان ورابط يوتيوب مطلوبان" }, { status: 400 });
  }
  if (!getYouTubeVideoId(youtubeUrl)) {
    return NextResponse.json({ error: "رابط يوتيوب غير صالح" }, { status: 400 });
  }

  try {
    const video = await createElhawyWorldVideo({
      title,
      titleEn: body.titleEn != null ? String(body.titleEn) : null,
      description: body.description != null ? String(body.description) : null,
      descriptionEn: body.descriptionEn != null ? String(body.descriptionEn) : null,
      youtubeUrl,
      coverImageUrl: body.coverImageUrl != null ? String(body.coverImageUrl) : null,
      isPublished: body.isPublished !== false,
      sortOrder: Number(body.sortOrder ?? 0) || 0,
    });
    return NextResponse.json({ success: true, video });
  } catch (e) {
    console.error("API dashboard elhawy-world POST:", e);
    return NextResponse.json({ error: "فشل إنشاء الفيديو" }, { status: 500 });
  }
}
