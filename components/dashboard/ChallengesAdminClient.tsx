"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";

type ChallengeRow = {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  questionType: "MULTIPLE_CHOICE" | "TEXT";
  options: string[];
  correctAnswer: string;
  isActive: boolean;
  sortOrder: number;
};

const emptyForm = {
  title: "",
  titleEn: "",
  description: "",
  descriptionEn: "",
  questionType: "MULTIPLE_CHOICE" as "MULTIPLE_CHOICE" | "TEXT",
  options: ["", ""],
  correctAnswer: "",
  isActive: true,
  sortOrder: 0,
};

export function ChallengesAdminClient() {
  const router = useRouter();
  const t = useT();
  const C = "dashboard.adminChallenges";
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/challenges", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setChallenges(data.challenges ?? []);
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
  }

  function startEdit(challenge: ChallengeRow) {
    setEditingId(challenge.id);
    setForm({
      title: challenge.title,
      titleEn: challenge.titleEn ?? "",
      description: challenge.description ?? "",
      descriptionEn: challenge.descriptionEn ?? "",
      questionType: challenge.questionType,
      options: challenge.options.length >= 2 ? challenge.options : ["", ""],
      correctAnswer: challenge.correctAnswer,
      isActive: challenge.isActive,
      sortOrder: challenge.sortOrder,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...form,
        options: form.questionType === "MULTIPLE_CHOICE" ? form.options.filter((o) => o.trim()) : [],
      };
      const res = await fetch(
        editingId ? `/api/dashboard/challenges/${encodeURIComponent(editingId)}` : "/api/dashboard/challenges",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t(`${C}.saveFailed`, "Save failed"));
      setSuccess(t(`${C}.saveSuccess`, "Challenge saved"));
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
    if (!window.confirm(t(`${C}.deleteConfirm`, "Delete this challenge?"))) return;
    const res = await fetch(`/api/dashboard/challenges/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      alert(t(`${C}.deleteFailed`, "Delete failed"));
      return;
    }
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
          {editingId ? t(`${C}.editTitle`, "Edit challenge") : t(`${C}.createTitle`, "New challenge")}
        </h3>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <input
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder={t(`${C}.titleAr`, "Title (Arabic)")}
          className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <input
          value={form.titleEn}
          onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))}
          placeholder={t(`${C}.titleEn`, "Title (English)")}
          className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder={t(`${C}.descriptionAr`, "Description (Arabic)")}
          rows={3}
          className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <select
          value={form.questionType}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              questionType: e.target.value as "MULTIPLE_CHOICE" | "TEXT",
            }))
          }
          className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
        >
          <option value="MULTIPLE_CHOICE">{t(`${C}.multipleChoice`, "Multiple choice")}</option>
          <option value="TEXT">{t(`${C}.textAnswer`, "Text answer")}</option>
        </select>

        {form.questionType === "MULTIPLE_CHOICE" ? (
          <div className="space-y-2">
            {form.options.map((option, idx) => (
              <input
                key={idx}
                value={option}
                onChange={(e) => {
                  const next = [...form.options];
                  next[idx] = e.target.value;
                  setForm((f) => ({ ...f, options: next }));
                }}
                placeholder={`${t(`${C}.option`, "Option")} ${idx + 1}`}
                className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            ))}
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, options: [...f.options, ""] }))}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              + {t(`${C}.addOption`, "Add option")}
            </button>
          </div>
        ) : null}

        <input
          required
          value={form.correctAnswer}
          onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))}
          placeholder={t(`${C}.correctAnswer`, "Correct answer")}
          className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          {t(`${C}.active`, "Active")}
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </button>
          {editingId ? (
            <button type="button" onClick={resetForm} className="rounded-[var(--radius-btn)] border px-4 py-2 text-sm">
              {t("common.cancel", "Cancel")}
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{t(`${C}.listTitle`, "All challenges")}</h3>
        {loading ? (
          <p className="text-sm text-[var(--color-muted)]">{t("common.loading", "Loading...")}</p>
        ) : challenges.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">{t(`${C}.empty`, "No challenges yet.")}</p>
        ) : (
          challenges.map((challenge) => (
            <div
              key={challenge.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--color-foreground)]">{challenge.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {challenge.questionType} · {challenge.isActive ? t(`${C}.active`, "Active") : t(`${C}.inactive`, "Inactive")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startEdit(challenge)} className="text-sm text-[var(--color-primary)] hover:underline">
                    {t("common.edit", "Edit")}
                  </button>
                  <button type="button" onClick={() => void handleDelete(challenge.id)} className="text-sm text-red-600 hover:underline">
                    {t("common.delete", "Delete")}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
