import { prisma, generateId } from "./client";
import type { Review } from "@/lib/types";

type ReviewRow = {
  id: string;
  text: string;
  text_en: string | null;
  author_name: string;
  author_title: string | null;
  author_title_en: string | null;
  avatar_letter: string | null;
  image_url: string | null;
  order: number;
  created_at: Date;
  updated_at: Date;
};

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    text: row.text,
    textEn: row.text_en,
    authorName: row.author_name,
    authorTitle: row.author_title,
    authorTitleEn: row.author_title_en,
    avatarLetter: row.avatar_letter,
    imageUrl: row.image_url,
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getReviews(): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    orderBy: [{ order: "asc" }, { created_at: "desc" }],
  });
  return rows.map(mapReview);
}

export async function getReviewById(id: string): Promise<Review | null> {
  const row = await prisma.review.findUnique({ where: { id } });
  return row ? mapReview(row) : null;
}

export async function createReview(data: {
  text: string;
  text_en?: string | null;
  author_name: string;
  author_title?: string | null;
  author_title_en?: string | null;
  avatar_letter?: string | null;
  image_url?: string | null;
  order?: number;
}): Promise<Review> {
  const id = generateId();
  const row = await prisma.review.create({
    data: {
      id,
      text: data.text,
      text_en: data.text_en ?? null,
      author_name: data.author_name,
      author_title: data.author_title ?? null,
      author_title_en: data.author_title_en ?? null,
      avatar_letter: data.avatar_letter ?? null,
      image_url: data.image_url ?? null,
      order: data.order ?? 0,
    },
  });
  return mapReview(row);
}

export async function updateReview(
  id: string,
  data: {
    text?: string;
    text_en?: string | null;
    author_name?: string;
    author_title?: string | null;
    author_title_en?: string | null;
    avatar_letter?: string | null;
    image_url?: string | null;
    order?: number;
  },
): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (data.text !== undefined) updateData.text = data.text;
  if (data.text_en !== undefined) updateData.text_en = data.text_en;
  if (data.author_name !== undefined) updateData.author_name = data.author_name;
  if (data.author_title !== undefined) updateData.author_title = data.author_title;
  if (data.author_title_en !== undefined) updateData.author_title_en = data.author_title_en;
  if (data.avatar_letter !== undefined) updateData.avatar_letter = data.avatar_letter;
  if (data.image_url !== undefined) updateData.image_url = data.image_url;
  if (data.order !== undefined) updateData.order = data.order;
  if (Object.keys(updateData).length === 0) return;
  updateData.updated_at = new Date();
  await prisma.review.update({ where: { id }, data: updateData });
}

export async function deleteReview(id: string): Promise<void> {
  await prisma.review.deleteMany({ where: { id } });
}
