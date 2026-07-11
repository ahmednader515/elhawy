import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getServerTranslator, getLocaleFromCookie } from "@/lib/i18n/server";
import { getGamificationPointValues } from "@/lib/gamification-point-settings";
import { getStudentGamificationProfile } from "@/lib/gamification";
import { PointsSystemExplainer } from "@/components/dashboard/PointsSystemExplainer";
import "@/components/dashboard-wizard.css";

export default async function PointsSystemPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const locale = await getLocaleFromCookie();
  const [t, pointValues, profile] = await Promise.all([
    getServerTranslator(),
    getGamificationPointValues(),
    getStudentGamificationProfile(session.user.id, locale),
  ]);

  return (
    <div className="dashboard-wizard space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← {t("dashboard.title", "Dashboard")}
        </Link>
        <h2 className="mt-3 text-xl font-semibold text-[var(--color-foreground)]">
          {t("dashboard.pointsSystem.pageTitle", "Points system")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t("dashboard.pointsSystem.pageIntro", "Discover how magic points are earned and how you level up.")}
        </p>
      </div>
      <PointsSystemExplainer
        pointValues={pointValues}
        currentLevel={profile.level}
        maxLevel={profile.maxLevel}
      />
    </div>
  );
}
