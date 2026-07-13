import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteElhawyWorldVideo, updateElhawyWorldVideo } from "@/lib/db";
import { getYouTubeVideoId } from "@/lib/youtube";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (body.youtubeUrl != null) {
    const youtubeUrl = String(body.youtubeUrl).trim();
    if (!youtubeUrl || !getYouTubeVideoId(youtubeUrl)) {
      return NextResponse.json({ error: "رابط يوتيوب غير صالح" }, { status: 400 });
    }
  }

  try {
    const video = await updateElhawyWorldVideo(id, {
      title: body.title != null ? String(body.title).trim() : undefined,
      titleEn: body.titleEn !== undefined ? (body.titleEn ? String(body.titleEn).trim() : null) : undefined,
      description:
        body.description !== undefined
          ? body.description
            ? String(body.description).trim()
            : null
          : undefined,
      descriptionEn:
        body.descriptionEn !== undefined
          ? body.descriptionEn
            ? String(body.descriptionEn).trim()
            : null
          : undefined,
      youtubeUrl: body.youtubeUrl != null ? String(body.youtubeUrl).trim() : undefined,
      coverImageUrl:
        body.coverImageUrl !== undefined
          ? body.coverImageUrl
            ? String(body.coverImageUrl).trim()
            : null
          : undefined,
      isPublished: typeof body.isPublished === "boolean" ? body.isPublished : undefined,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) || 0 : undefined,
    });
    if (!video) {
      return NextResponse.json({ error: "الفيديو غير موجود" }, { status: 404 });
    }
    return NextResponse.json({ success: true, video });
  } catch (e) {
    console.error("API dashboard elhawy-world PUT:", e);
    return NextResponse.json({ error: "فشل تحديث الفيديو" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  const deleted = await deleteElhawyWorldVideo(id);
  if (!deleted) {
    return NextResponse.json({ error: "الفيديو غير موجود" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
