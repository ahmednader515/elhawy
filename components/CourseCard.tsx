"use client";

import Link from "next/link";
import { useT } from "./LocaleProvider";
import "./course-card.css";

function normalizeCoursePrice(
  price: number | { toNumber?: () => number } | string | undefined,
): number | null {
  if (price === undefined || price === null || price === "") return null;
  if (typeof price === "object" && price !== null && typeof price.toNumber === "function") {
    const n = price.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(price);
  return Number.isFinite(n) ? n : null;
}

const MAGIC_SUITS = ["✦", "☽", "✧", "♠"] as const;

function suitForCourseId(id: string): (typeof MAGIC_SUITS)[number] {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % MAGIC_SUITS.length;
  }
  return MAGIC_SUITS[hash] ?? MAGIC_SUITS[0];
}

function rankForCourse(level?: string | null): string {
  if (level === "advanced") return "A";
  if (level === "intermediate") return "K";
  if (level === "beginner") return "7";
  return "10";
}

type Course = {
  id: string;
  title: string;
  titleAr?: string | null;
  slug?: string | null;
  shortDesc?: string | null;
  shortDescEn?: string | null;
  duration?: string | null;
  level?: string | null;
  imageUrl?: string | null;
  price?: number | { toNumber?: () => number } | string;
  courseRating?: number | { toNumber?: () => number } | string | null;
  courseRatingCount?: number | { toNumber?: () => number } | string | null;
  category?: { name: string; nameAr?: string | null } | null;
};

function CardCorner({ rank, suit }: { rank: string; suit: string }) {
  return (
    <>
      <span className="playing-card-rank">{rank}</span>
      <span className="playing-card-suit" aria-hidden>
        {suit}
      </span>
    </>
  );
}

export function CourseCard({ course }: { course: Course }) {
  const t = useT();
  const displayTitle = course.titleAr || course.title;
  const categoryName = course.category?.nameAr || course.category?.name;
  const shortDescription = course.shortDesc || course.shortDescEn;
  const slugOrId = course.slug && course.slug.trim() ? encodeURIComponent(course.slug.trim()) : course.id;
  const href = slugOrId ? `/courses/${slugOrId}` : "/courses";
  const priceValue = normalizeCoursePrice(course.price);
  const courseRatingValue = normalizeCoursePrice(course.courseRating ?? undefined);
  const courseRatingCountValue = normalizeCoursePrice(course.courseRatingCount ?? undefined);
  const hasCourseRating =
    courseRatingValue !== null &&
    courseRatingValue > 0 &&
    courseRatingCountValue !== null &&
    courseRatingCountValue > 0;
  const priceDisplay = priceValue !== null && priceValue > 0 ? priceValue.toFixed(2) : null;
  const isPaid = priceDisplay !== null;

  const rank = rankForCourse(course.level);
  const suit = suitForCourseId(course.id);

  return (
    <Link href={href} className="playing-card group">
      <div className="playing-card-face">
        <div className="playing-card-corner playing-card-corner--tl">
          <CardCorner rank={rank} suit={suit} />
        </div>
        <div className="playing-card-corner playing-card-corner--br" aria-hidden>
          <CardCorner rank={rank} suit={suit} />
        </div>

        <div className="playing-card-art">
          {course.imageUrl ? (
            <img src={course.imageUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="playing-card-art-placeholder" aria-hidden>
              ✦
            </span>
          )}
        </div>

        <div className="playing-card-body">
          {categoryName ? <span className="playing-card-category">{categoryName}</span> : null}
          <h3 className="playing-card-title">{displayTitle}</h3>
          {shortDescription ? <p className="playing-card-desc">{shortDescription}</p> : null}

          <div className="playing-card-footer">
            {isPaid ? (
              <span className="playing-card-chip playing-card-chip--price">
                {priceDisplay} {t("common.egyptianPoundShort", "EGP")}
              </span>
            ) : (
              <span className="playing-card-chip playing-card-chip--free">
                {t("common.free", "Free")}
              </span>
            )}
            {hasCourseRating ? (
              <span className="playing-card-chip playing-card-chip--rating">
                ★ {courseRatingValue.toFixed(1)}
              </span>
            ) : (
              <span className="playing-card-chip playing-card-chip--muted">
                {t("courses.noRatings", "No ratings yet")}
              </span>
            )}
            {course.duration ? (
              <span className="playing-card-chip playing-card-chip--muted">⏱ {course.duration}</span>
            ) : null}
            {course.level ? (
              <span className="playing-card-chip playing-card-chip--muted">
                {course.level === "beginner" && t("common.beginner", "Beginner")}
                {course.level === "intermediate" && t("common.intermediate", "Intermediate")}
                {course.level === "advanced" && t("common.advanced", "Advanced")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
