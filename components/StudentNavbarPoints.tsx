"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { GAMIFICATION_XP_UPDATED_EVENT } from "@/lib/gamification-navbar";
import { fillMessage } from "@/lib/i18n/interpolate";
import "@/components/dashboard-wizard.css";

export function StudentNavbarPoints({ initialXp }: { initialXp?: number | null }) {
  const { data: session } = useSession();
  const t = useT();
  const [xp, setXp] = useState<number | null>(initialXp ?? null);

  useEffect(() => {
    setXp(initialXp ?? null);
  }, [initialXp]);

  useEffect(() => {
    if (session?.user?.role !== "STUDENT") return;

    const refresh = () => {
      fetch("/api/progress/me", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && typeof data.xp === "number") setXp(data.xp);
        })
        .catch(() => {});
    };

    const onXpUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ xp?: number }>).detail;
      if (typeof detail?.xp === "number") setXp(detail.xp);
      else refresh();
    };

    if (initialXp == null) refresh();

    window.addEventListener(GAMIFICATION_XP_UPDATED_EVENT, onXpUpdated);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(GAMIFICATION_XP_UPDATED_EVENT, onXpUpdated);
      window.removeEventListener("focus", refresh);
    };
  }, [session?.user?.role, initialXp]);

  if (session?.user?.role !== "STUDENT") return null;
  if (xp === null) return null;

  const label = fillMessage(t("header.studentPoints", "Your points: {points}"), {
    points: String(xp),
  });

  return (
    <Link
      href="/dashboard/leaderboard"
      className="wizard-level-badge shrink-0 transition hover:bg-[rgba(212,168,83,0.2)]"
      title={label}
      aria-label={label}
    >
      <span aria-hidden>✦</span>
      <span className="tabular-nums">{xp}</span>
      <span className="hidden text-[0.7rem] font-semibold sm:inline">{t("wizard.points", "Magic points")}</span>
    </Link>
  );
}
