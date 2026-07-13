import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { ElhawyWorldAdminClient } from "@/components/dashboard/ElhawyWorldAdminClient";

export default async function ElhawyWorldManagePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const t = await getServerTranslator();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← {t("dashboard.title", "Dashboard")}
        </Link>
        <h2 className="mt-3 text-xl font-semibold text-[var(--color-foreground)]">
          {t("dashboard.elhawyWorldAdmin.pageTitle", "Manage Elhawy World")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t(
            "dashboard.elhawyWorldAdmin.pageIntro",
            "Add YouTube videos for students on the Elhawy World page.",
          )}
        </p>
      </div>
      <ElhawyWorldAdminClient />
    </div>
  );
}
