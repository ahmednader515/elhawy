import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { getGamificationPointValues } from "@/lib/gamification-point-settings";
import { GamificationPointsForm } from "./GamificationPointsForm";

export default async function AdminGamificationPointsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [t, values] = await Promise.all([getServerTranslator(), getGamificationPointValues()]);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← {t("dashboard.title", "Dashboard")}
        </Link>
        <h2 className="mt-3 text-xl font-semibold text-[var(--color-foreground)]">
          {t("dashboard.gamificationPoints.pageTitle", "Points control")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t(
            "dashboard.gamificationPoints.pageIntro",
            "Configure how many magic points students earn for each action.",
          )}
        </p>
      </div>

      <GamificationPointsForm initialValues={values} />
    </div>
  );
}
