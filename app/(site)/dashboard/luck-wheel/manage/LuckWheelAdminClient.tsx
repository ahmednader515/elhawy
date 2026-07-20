"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/components/LocaleProvider";
import { dateLocaleForUi, useDashboardTable } from "@/lib/i18n/dashboard-table";
import {
  getLuckWheelSegmentLabel,
  isLuckWheelSegmentKey,
} from "@/lib/luck-wheel";

type AdminSpinRow = {
  id: string;
  userId: string;
  resultKey: string;
  createdAt: string;
  studentName: string;
  studentEmail: string;
};

export function LuckWheelAdminClient({
  initialEnabled,
  initialSpins,
}: {
  initialEnabled: boolean;
  initialSpins: AdminSpinRow[];
}) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const A = "dashboard.luckWheelAdmin";
  const { dir, thClass } = useDashboardTable();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [spins, setSpins] = useState(initialSpins);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setEnabled(initialEnabled);
    setSpins(initialSpins);
  }, [initialEnabled, initialSpins]);

  const labelFor = useCallback(
    (key: string) => {
      if (!isLuckWheelSegmentKey(key)) return key;
      return getLuckWheelSegmentLabel(key, locale === "en" ? "en" : "ar");
    },
    [locale],
  );

  const reloadSpins = useCallback(async () => {
    const res = await fetch("/api/dashboard/luck-wheel/spins?limit=100", {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { spins?: AdminSpinRow[] };
    if (data.spins) setSpins(data.spins);
  }, []);

  async function patchEnabled(next: boolean) {
    setLoading(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/dashboard/settings/luck-wheel-enabled", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t(`${A}.updateFailed`, "Failed to update"));
      return;
    }
    setEnabled(next);
    setSuccess(
      next
        ? t(`${A}.enabledSuccess`, "Luck wheel is now open for students")
        : t(`${A}.disabledSuccess`, "Luck wheel is now closed for students"),
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
              {t(`${A}.permissionTitle`, "Permission")}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {t(
                `${A}.permissionIntro`,
                "When enabled, all students can spin the luck wheel. When disabled, spinning is blocked.",
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void patchEnabled(!enabled)}
            className={`rounded-[var(--radius-btn)] px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
              enabled
                ? "border border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
                : "bg-[var(--color-primary)] text-white hover:opacity-90"
            }`}
          >
            {loading
              ? t(`${A}.saving`, "Saving…")
              : enabled
                ? t(`${A}.disable`, "Close wheel")
                : t(`${A}.enable`, "Open wheel")}
          </button>
        </div>
        <p className="mt-3 text-sm font-medium text-[var(--color-foreground)]">
          {t(`${A}.statusLabel`, "Status")}:{" "}
          <span className={enabled ? "text-emerald-700" : "text-[var(--color-muted)]"}>
            {enabled
              ? t(`${A}.statusOpen`, "Open — students can spin")
              : t(`${A}.statusClosed`, "Closed — students cannot spin")}
          </span>
        </p>
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-2 text-sm text-emerald-700" role="status">
            {success}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            {t(`${A}.historyTitle`, "Spin history")}
          </h3>
          <button
            type="button"
            onClick={() => void reloadSpins()}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-border)]/40"
          >
            {t(`${A}.refresh`, "Refresh")}
          </button>
        </div>

        {spins.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            {t(`${A}.historyEmpty`, "No spins recorded yet.")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)]">
            <table className="min-w-full text-sm" dir={dir}>
              <thead className="bg-[var(--color-border)]/30">
                <tr>
                  <th className={thClass}>{t(`${A}.colStudent`, "Student")}</th>
                  <th className={thClass}>{t(`${A}.colEmail`, "Email")}</th>
                  <th className={thClass}>{t(`${A}.colResult`, "Result")}</th>
                  <th className={thClass}>{t(`${A}.colTime`, "Time")}</th>
                </tr>
              </thead>
              <tbody>
                {spins.map((spin) => (
                  <tr key={spin.id} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2 text-[var(--color-foreground)]">
                      {spin.studentName || "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">
                      {spin.studentEmail || "—"}
                    </td>
                    <td className="px-3 py-2 font-medium text-[var(--color-foreground)]">
                      {labelFor(spin.resultKey)}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">
                      <time dateTime={spin.createdAt}>
                        {new Date(spin.createdAt).toLocaleString(dateLocaleForUi(locale), {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
