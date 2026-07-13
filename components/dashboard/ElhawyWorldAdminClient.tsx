"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";

type VideoRow = {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  youtubeUrl: string;
  coverImageUrl: string | null;
  isPublished: boolean;
  sortOrder: number;
};

const emptyForm = {
  title: "",
  titleEn: "",
  description: "",
  descriptionEn: "",
  youtubeUrl: "",
  coverImageUrl: "",
  isPublished: true,
  sortOrder: 0,
};

export function ElhawyWorldAdminClient() {
  const router = useRouter();
  const t = useT();
  const C = "dashboard.elhawyWorldAdmin";
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

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

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
    setImageError("");
  }

  function startEdit(video: VideoRow) {
    setEditingId(video.id);
    setForm({
      title: video.title,
      titleEn: video.titleEn ?? "",
      description: video.description ?? "",
      descriptionEn: video.descriptionEn ?? "",
      youtubeUrl: video.youtubeUrl,
      coverImageUrl: video.coverImageUrl ?? "",
      isPublished: video.isPublished,
      sortOrder: video.sortOrder,
    });
    setError("");
    setSuccess("");
    setImageError("");
  }

  async function onCoverFile(file: File | undefined) {
    if (!file) return;
    setImageUploading(true);
    setImageError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(`${C}.uploadFailed`, "Upload failed"));
      const url = typeof data.url === "string" ? data.url : "";
      if (!url) throw new Error(t(`${C}.uploadFailed`, "Upload failed"));
      setForm((f) => ({ ...f, coverImageUrl: url }));
    } catch (err) {
      setImageError(err instanceof Error ? err.message : t(`${C}.uploadFailed`, "Upload failed"));
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        title: form.title.trim(),
        titleEn: form.titleEn.trim() || null,
        description: form.description.trim() || null,
        descriptionEn: form.descriptionEn.trim() || null,
        youtubeUrl: form.youtubeUrl.trim(),
        coverImageUrl: form.coverImageUrl.trim() || null,
        isPublished: form.isPublished,
        sortOrder: Number(form.sortOrder) || 0,
      };
      const res = await fetch(
        editingId
          ? `/api/dashboard/elhawy-world/${encodeURIComponent(editingId)}`
          : "/api/dashboard/elhawy-world",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t(`${C}.saveFailed`, "Save failed"));
      setSuccess(t(`${C}.saveSuccess`, "Video saved"));
      resetForm();
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(`${C}.saveFailed`, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t(`${C}.deleteConfirm`, "Delete this video?"))) return;
    const res = await fetch(`/api/dashboard/elhawy-world/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      alert(t(`${C}.deleteFailed`, "Delete failed"));
      return;
    }
    if (editingId === id) resetForm();
    await load();
    router.refresh();
  }

  async function togglePublished(video: VideoRow) {
    const res = await fetch(`/api/dashboard/elhawy-world/${encodeURIComponent(video.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isPublished: !video.isPublished }),
    });
    if (!res.ok) {
      alert(t(`${C}.saveFailed`, "Save failed"));
      return;
    }
    await load();
    router.refresh();
  }

  const inputClass =
    "w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]";

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
          {editingId ? t(`${C}.editTitle`, "Edit video") : t(`${C}.createTitle`, "New video")}
        </h3>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <input
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder={t(`${C}.titleAr`, "Title (Arabic)")}
          className={inputClass}
        />
        <input
          value={form.titleEn}
          onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))}
          placeholder={t(`${C}.titleEn`, "Title (English)")}
          className={inputClass}
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder={t(`${C}.descriptionAr`, "Description (Arabic)")}
          rows={3}
          className={inputClass}
        />
        <textarea
          value={form.descriptionEn}
          onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
          placeholder={t(`${C}.descriptionEn`, "Description (English)")}
          rows={3}
          className={inputClass}
        />
        <input
          required
          type="url"
          value={form.youtubeUrl}
          onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
          placeholder={t(`${C}.youtubePlaceholder`, "YouTube Shorts URL (https://youtube.com/shorts/…)")}
          className={inputClass}
        />

        <div>
          {form.coverImageUrl ? (
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.coverImageUrl}
                alt=""
                className="h-16 w-28 rounded object-cover border border-[var(--color-border)]"
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, coverImageUrl: "" }))}
                className="text-xs text-red-500 underline"
              >
                {t(`${C}.removeCover`, "Remove cover")}
              </button>
            </div>
          ) : null}
          <label className="inline-flex cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-border)]/50">
            {imageUploading
              ? t(`${C}.uploadCoverBusy`, "Uploading…")
              : t(`${C}.uploadCoverIdle`, "Upload cover image (optional)")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={imageUploading}
              onChange={(e) => {
                void onCoverFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {imageError ? <p className="mt-1 text-xs text-red-500">{imageError}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
              className="accent-[var(--color-primary)]"
            />
            {t(`${C}.published`, "Published")}
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
            <span>{t(`${C}.sortOrder`, "Sort order")}</span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
              className="w-24 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {saving ? t(`${C}.saving`, "Saving…") : t(`${C}.save`, "Save")}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
            >
              {t(`${C}.cancelEdit`, "Cancel edit")}
            </button>
          ) : null}
        </div>
      </form>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
          {t(`${C}.listTitle`, "All videos")}
        </h3>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--color-muted)]">{t("common.loading", "Loading...")}</p>
        ) : videos.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-muted)]">{t(`${C}.empty`, "No videos yet.")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {videos.map((video) => (
              <li
                key={video.id}
                className="flex flex-col gap-3 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {video.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.coverImageUrl}
                      alt=""
                      className="h-14 w-24 shrink-0 rounded object-cover border border-[var(--color-border)]"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-foreground)]">{video.title}</p>
                    {video.titleEn ? (
                      <p className="text-xs text-[var(--color-muted)]">{video.titleEn}</p>
                    ) : null}
                    <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{video.youtubeUrl}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {video.isPublished
                        ? t(`${C}.published`, "Published")
                        : t(`${C}.draft`, "Draft")}{" "}
                      · {t(`${C}.sortOrder`, "Sort order")}: {video.sortOrder}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(video)}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    {t(`${C}.edit`, "Edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void togglePublished(video)}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    {video.isPublished
                      ? t(`${C}.unpublish`, "Unpublish")
                      : t(`${C}.publish`, "Publish")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(video.id)}
                    className="text-sm text-red-600 hover:underline dark:text-red-400"
                  >
                    {t(`${C}.delete`, "Delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
