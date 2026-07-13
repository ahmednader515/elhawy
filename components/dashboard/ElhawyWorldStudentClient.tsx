"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT } from "@/components/LocaleProvider";
import { PlyrVideoPlayer } from "@/components/plyr-video-player";
import { pickLocalizedText } from "@/lib/i18n/localized-field";
import { getYouTubeThumbnailUrl, getYouTubeVideoId } from "@/lib/youtube";

type VideoRow = {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  youtubeUrl: string;
  coverImageUrl: string | null;
};

export function ElhawyWorldStudentClient() {
  const t = useT();
  const locale = useLocale();
  const C = "dashboard.elhawyWorld";
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/elhawy-world", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setVideos(data.videos ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = videos.find((v) => v.id === activeId) ?? null;
  const activeYoutubeId = active ? getYouTubeVideoId(active.youtubeUrl) : null;

  if (loading) {
    return <p className="text-sm text-[var(--color-muted)]">{t("common.loading", "Loading...")}</p>;
  }

  if (videos.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted)]">
        {t(`${C}.empty`, "No videos yet. Check back soon.")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {active && activeYoutubeId ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                {pickLocalizedText(locale, active.title, active.titleEn)}
              </h3>
              {pickLocalizedText(locale, active.description, active.descriptionEn) ? (
                <p className="mt-1 text-sm text-[var(--color-muted)] whitespace-pre-wrap">
                  {pickLocalizedText(locale, active.description, active.descriptionEn)}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              {t(`${C}.closePlayer`, "Close player")}
            </button>
          </div>
          <div className="mx-auto w-full max-w-[360px]">
            <div className="aspect-[9/16] overflow-hidden rounded-[var(--radius-btn)] bg-black">
              <PlyrVideoPlayer
                youtubeVideoId={activeYoutubeId}
                storageKey={`elhawy-world-${active.id}`}
                className="h-full [&_.plyr]:h-full"
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video) => {
          const title = pickLocalizedText(locale, video.title, video.titleEn);
          const description = pickLocalizedText(locale, video.description, video.descriptionEn);
          const cover = video.coverImageUrl?.trim() || getYouTubeThumbnailUrl(video.youtubeUrl);
          const canPlay = Boolean(getYouTubeVideoId(video.youtubeUrl));
          return (
            <button
              key={video.id}
              type="button"
              disabled={!canPlay}
              onClick={() => setActiveId(video.id)}
              className="group overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] text-start transition hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-hover)] disabled:opacity-50"
            >
              <div className="relative aspect-[9/16] bg-[var(--color-background)]">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
                    {t(`${C}.noCover`, "Video")}
                  </div>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition group-hover:opacity-100">
                  <span className="rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white">
                    {t(`${C}.watch`, "Watch")}
                  </span>
                </span>
              </div>
              <div className="p-4">
                <p className="font-semibold text-[var(--color-foreground)] line-clamp-2">{title}</p>
                {description ? (
                  <p className="mt-1 text-sm text-[var(--color-muted)] line-clamp-3">{description}</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
