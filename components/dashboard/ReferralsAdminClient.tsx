"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";

type ReferralRequestRow = {
  id: string;
  studentName: string;
  studentMobile: string;
  studentEmail: string;
  referrerName: string;
  referrerMobile: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  matchedReferrerName?: string | null;
};

type StudentOption = { id: string; name: string; email: string };

export function ReferralsAdminClient() {
  const t = useT();
  const R = "dashboard.adminReferrals";
  const [requests, setRequests] = useState<ReferralRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<StudentOption[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter === "ALL" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/dashboard/referrals${query}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setRequests(data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      fetch(`/api/dashboard/referrals?search=${encodeURIComponent(search.trim())}`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setSearchResults(data?.students ?? []));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  async function approve(id: string) {
    const referrerUserId = selectedReferrer[id];
    if (!referrerUserId) {
      alert(t(`${R}.selectReferrer`, "Select the referrer student account"));
      return;
    }
    setProcessingId(id);
    try {
      const res = await fetch(`/api/dashboard/referrals/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ referrerUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? t(`${R}.approveFailed`, "Approval failed"));
        return;
      }
      await load();
    } finally {
      setProcessingId(null);
    }
  }

  async function reject(id: string) {
    if (!window.confirm(t(`${R}.rejectConfirm`, "Reject this referral request?"))) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/dashboard/referrals/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? t(`${R}.rejectFailed`, "Reject failed"));
        return;
      }
      await load();
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-[var(--radius-btn)] border px-3 py-1.5 text-sm ${
              filter === value ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : ""
            }`}
          >
            {t(`${R}.filter.${value.toLowerCase()}`, value)}
          </button>
        ))}
      </div>

      <div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(`${R}.searchStudents`, "Search students by name or email")}
          className="w-full max-w-md rounded-[var(--radius-btn)] border px-3 py-2 text-sm"
        />
        {searchResults.length > 0 ? (
          <ul className="mt-2 max-w-md rounded border bg-[var(--color-surface)] text-sm">
            {searchResults.map((student) => (
              <li key={student.id} className="border-b px-3 py-2 last:border-b-0">
                {student.name} · {student.email}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">{t("common.loading", "Loading...")}</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t(`${R}.empty`, "No referral requests.")}</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <article key={req.id} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-[var(--color-muted)]">{t(`${R}.student`, "Student")}:</span> {req.studentName}</p>
                <p><span className="text-[var(--color-muted)]">{t(`${R}.mobile`, "Mobile")}:</span> {req.studentMobile}</p>
                <p><span className="text-[var(--color-muted)]">{t(`${R}.email`, "Email")}:</span> {req.studentEmail}</p>
                <p><span className="text-[var(--color-muted)]">{t(`${R}.friend`, "Friend")}:</span> {req.referrerName} · {req.referrerMobile}</p>
                <p><span className="text-[var(--color-muted)]">{t(`${R}.status`, "Status")}:</span> {req.status}</p>
              </div>

              {req.status === "PENDING" ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={selectedReferrer[req.id] ?? ""}
                    onChange={(e) => setSelectedReferrer((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    className="rounded-[var(--radius-btn)] border px-3 py-2 text-sm"
                  >
                    <option value="">{t(`${R}.selectReferrer`, "Select referrer account")}</option>
                    {searchResults.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} · {student.email}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => void approve(req.id)}
                      className="rounded-[var(--radius-btn)] bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {t(`${R}.approve`, "Approve")}
                    </button>
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => void reject(req.id)}
                      className="rounded-[var(--radius-btn)] border border-red-500 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
                    >
                      {t(`${R}.reject`, "Reject")}
                    </button>
                  </div>
                </div>
              ) : req.matchedReferrerName ? (
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  {t(`${R}.matchedReferrer`, "Referrer")}: {req.matchedReferrerName}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
