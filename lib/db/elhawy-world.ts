import { prisma, generateId } from "./client";
import type { ElhawyWorldVideo as PrismaElhawyWorldVideo } from "@prisma/client";

export type ElhawyWorldVideoRow = {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  youtubeUrl: string;
  coverImageUrl: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

function mapElhawyWorldVideo(row: PrismaElhawyWorldVideo): ElhawyWorldVideoRow {
  return {
    id: row.id,
    title: row.title,
    titleEn: row.title_en,
    description: row.description,
    descriptionEn: row.description_en,
    youtubeUrl: row.youtube_url,
    coverImageUrl: row.cover_image_url,
    isPublished: row.is_published,
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listElhawyWorldVideosAll(): Promise<ElhawyWorldVideoRow[]> {
  const rows = await prisma.elhawyWorldVideo.findMany({
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
  });
  return rows.map(mapElhawyWorldVideo);
}

export async function listElhawyWorldVideosPublished(): Promise<ElhawyWorldVideoRow[]> {
  const rows = await prisma.elhawyWorldVideo.findMany({
    where: { is_published: true },
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
  });
  return rows.map(mapElhawyWorldVideo);
}

export async function getElhawyWorldVideoById(id: string): Promise<ElhawyWorldVideoRow | null> {
  const row = await prisma.elhawyWorldVideo.findUnique({ where: { id } });
  return row ? mapElhawyWorldVideo(row) : null;
}

export async function createElhawyWorldVideo(data: {
  title: string;
  titleEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  youtubeUrl: string;
  coverImageUrl?: string | null;
  isPublished?: boolean;
  sortOrder?: number;
}): Promise<ElhawyWorldVideoRow> {
  const created = await prisma.elhawyWorldVideo.create({
    data: {
      id: generateId(),
      title: data.title.trim(),
      title_en: data.titleEn?.trim() || null,
      description: data.description?.trim() || null,
      description_en: data.descriptionEn?.trim() || null,
      youtube_url: data.youtubeUrl.trim(),
      cover_image_url: data.coverImageUrl?.trim() || null,
      is_published: data.isPublished !== false,
      sort_order: data.sortOrder ?? 0,
    },
  });
  return mapElhawyWorldVideo(created);
}

export async function updateElhawyWorldVideo(
  id: string,
  data: Partial<{
    title: string;
    titleEn: string | null;
    description: string | null;
    descriptionEn: string | null;
    youtubeUrl: string;
    coverImageUrl: string | null;
    isPublished: boolean;
    sortOrder: number;
  }>,
): Promise<ElhawyWorldVideoRow | null> {
  const existing = await getElhawyWorldVideoById(id);
  if (!existing) return null;

  const title = data.title?.trim() ?? existing.title;
  const titleEn = data.titleEn !== undefined ? data.titleEn?.trim() || null : existing.titleEn;
  const description = data.description !== undefined ? data.description?.trim() || null : existing.description;
  const descriptionEn =
    data.descriptionEn !== undefined ? data.descriptionEn?.trim() || null : existing.descriptionEn;
  const youtubeUrl = data.youtubeUrl?.trim() ?? existing.youtubeUrl;
  const coverImageUrl =
    data.coverImageUrl !== undefined ? data.coverImageUrl?.trim() || null : existing.coverImageUrl;
  const isPublished = data.isPublished ?? existing.isPublished;
  const sortOrder = data.sortOrder ?? existing.sortOrder;

  const updated = await prisma.elhawyWorldVideo.update({
    where: { id },
    data: {
      title,
      title_en: titleEn,
      description,
      description_en: descriptionEn,
      youtube_url: youtubeUrl,
      cover_image_url: coverImageUrl,
      is_published: isPublished,
      sort_order: sortOrder,
      updated_at: new Date(),
    },
  });
  return mapElhawyWorldVideo(updated);
}

export async function deleteElhawyWorldVideo(id: string): Promise<boolean> {
  const result = await prisma.elhawyWorldVideo.deleteMany({ where: { id } });
  return result.count > 0;
}
