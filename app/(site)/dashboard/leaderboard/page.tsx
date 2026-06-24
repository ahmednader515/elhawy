import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getLocaleFromCookie, getServerTranslator } from "@/lib/i18n/server";
import { getLeaderboard } from "@/lib/gamification";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import "@/components/dashboard-wizard.css";

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const [t, locale] = await Promise.all([getServerTranslator(), getLocaleFromCookie()]);
  const leaderboard = await getLeaderboard({
    scope: "global",
    limit: 50,
    userId: session.user.id,
    locale,
  });

  return (
    <div className="dashboard-wizard space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← {t("dashboard.title", "Dashboard")}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-[var(--color-foreground)]">
          {t("wizard.leaderboardTitle", "Hall of Fame")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t("wizard.leaderboardSubtitle", "Top wizards on the platform")}
        </p>
      </div>

      <LeaderboardTable
        entries={leaderboard.entries}
        callerEntry={leaderboard.callerEntry}
        currentUserId={session.user.id}
      />
    </div>
  );
}
