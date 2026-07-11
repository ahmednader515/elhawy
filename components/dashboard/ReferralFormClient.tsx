"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";

type ReferralRequestRow = {
  id: string;
  studentName: string;
  studentMobile: string;
  studentEmail: string;
  referrerName: string;
  referrerMobile: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type ReferralState = {
  request: ReferralRequestRow | null;
  canSubmit: boolean;
};

export function ReferralFormClient() {
  const router = useRouter();
  const t = useT();
  const R = "dashboard.referral";
  const [state, setState] = useState<ReferralState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    studentName: "",
    studentMobile: "",
    studentEmail: "",
    referrerName: "",
    referrerMobile: "",
  });

  useEffect(() => {
    fetch("/api/referrals", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setState({ request: data.request ?? null, canSubmit: Boolean(data.canSubmit) });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t(`${R}.submitFailed`, "Submit failed"));
      setSuccess(t(`${R}.submitSuccess`, "Your referral request was sent for review"));
      setState((prev) => ({ canSubmit: prev?.canSubmit ?? true, request: data.request ?? null }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(`${R}.submitFailed`, "Submit failed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-muted)]">{t("common.loading", "Loading...")}</p>;
  }

  if (!state?.canSubmit) {
    return (
      <p className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted)]">
        {t(`${R}.notEligible`, "You must be subscribed to the platform to submit a referral request.")}
      </p>
    );
  }

  if (state.request) {
    const statusLabel =
      state.request.status === "APPROVED"
        ? t(`${R}.statusApproved`, "Approved")
        : state.request.status === "REJECTED"
          ? t(`${R}.statusRejected`, "Rejected")
          : t(`${R}.statusPending`, "Pending review");

    return (
      <div className="max-w-xl space-y-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-sm font-medium text-[var(--color-foreground)]">{t(`${R}.alreadySubmitted`, "You already submitted a referral request.")}</p>
        <p className="text-sm text-[var(--color-muted)]">
          {t(`${R}.statusLabel`, "Status")}: <span className="font-semibold text-[var(--color-primary)]">{statusLabel}</span>
        </p>
        <dl className="grid gap-2 text-sm">
          <div><dt className="text-[var(--color-muted)]">{t(`${R}.yourName`, "Your name")}</dt><dd>{state.request.studentName}</dd></div>
          <div><dt className="text-[var(--color-muted)]">{t(`${R}.friendName`, "Friend name")}</dt><dd>{state.request.referrerName}</dd></div>
          <div><dt className="text-[var(--color-muted)]">{t(`${R}.friendMobile`, "Friend mobile")}</dt><dd>{state.request.referrerMobile}</dd></div>
        </dl>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <p className="text-sm text-[var(--color-muted)]">{t(`${R}.intro`, "If a friend invited you to subscribe, fill in your details and your friend's information.")}</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

      <input required value={form.studentName} onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))} placeholder={t(`${R}.yourName`, "Your name")} className="w-full rounded-[var(--radius-btn)] border px-3 py-2 text-sm" />
      <input required value={form.studentMobile} onChange={(e) => setForm((f) => ({ ...f, studentMobile: e.target.value }))} placeholder={t(`${R}.yourMobile`, "Your mobile")} className="w-full rounded-[var(--radius-btn)] border px-3 py-2 text-sm" />
      <input required type="email" value={form.studentEmail} onChange={(e) => setForm((f) => ({ ...f, studentEmail: e.target.value }))} placeholder={t(`${R}.yourEmail`, "Your Gmail")} className="w-full rounded-[var(--radius-btn)] border px-3 py-2 text-sm" />

      <div className="border-t border-[var(--color-border)] pt-4">
        <p className="mb-3 text-sm font-medium text-[var(--color-foreground)]">{t(`${R}.friendSection`, "Your friend who invited you")}</p>
        <input required value={form.referrerName} onChange={(e) => setForm((f) => ({ ...f, referrerName: e.target.value }))} placeholder={t(`${R}.friendName`, "Your friend name")} className="mb-3 w-full rounded-[var(--radius-btn)] border px-3 py-2 text-sm" />
        <input required value={form.referrerMobile} onChange={(e) => setForm((f) => ({ ...f, referrerMobile: e.target.value }))} placeholder={t(`${R}.friendMobile`, "Your friend mobile")} className="w-full rounded-[var(--radius-btn)] border px-3 py-2 text-sm" />
      </div>

      <button type="submit" disabled={submitting} className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? t("common.pleaseWait", "Please wait...") : t(`${R}.submit`, "Submit request")}
      </button>
    </form>
  );
}
