import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { countGlobalLeaderboardStudents } from "@/lib/db";
import { getLocaleFromCookie, getServerTranslator } from "@/lib/i18n/server";
import { getLeaderboard } from "@/lib/gamification";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { fillMessage } from "@/lib/i18n/interpolate";
import "@/components/dashboard-wizard.css";

export default async function AdminGamificationLeaderboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [t, locale] = await Promise.all([getServerTranslator(), getLocaleFromCookie()]);
  const [leaderboard, totalStudents] = await Promise.all([
    getLeaderboard({ scope: "global", limit: 100, locale }),
    countGlobalLeaderboardStudents(),
  ]);

  return (
    <div className="dashboard-wizard space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← {t("dashboard.title", "Dashboard")}
        </Link>
        <h2 className="mt-3 text-xl font-semibold text-[var(--color-foreground)]">
          {t("dashboard.adminLeaderboard.pageTitle", "Student leaderboard")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t("dashboard.adminLeaderboard.pageIntro", "Top students ranked by total magic points on the platform.")}
        </p>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          {fillMessage(t("dashboard.adminLeaderboard.totalStudents", "{count} students with points"), {
            count: String(totalStudents),
          })}
        </p>
      </div>

      <LeaderboardTable entries={leaderboard.entries} callerEntry={null} currentUserId="" showContactPhone />
    </div>
  );
}
