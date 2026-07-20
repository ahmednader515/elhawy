import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import {
  getLuckWheelFeatureEnabled,
  listLuckWheelSpinsForAdmin,
} from "@/lib/db";
import { getServerTranslator } from "@/lib/i18n/server";
import { LuckWheelAdminClient } from "./LuckWheelAdminClient";

export default async function LuckWheelManagePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const t = await getServerTranslator();

  const [enabled, spins] = await Promise.all([
    getLuckWheelFeatureEnabled(),
    listLuckWheelSpinsForAdmin(100).catch(() => []),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← {t("dashboard.title", "Dashboard")}
        </Link>
        <h2 className="mt-3 text-xl font-semibold text-[var(--color-foreground)]">
          {t("dashboard.luckWheelAdmin.pageTitle", "Luck wheel")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t(
            "dashboard.luckWheelAdmin.pageIntro",
            "Control whether students can spin, and review spin history. Prizes are display-only.",
          )}
        </p>
      </div>
      <LuckWheelAdminClient initialEnabled={enabled} initialSpins={spins} />
    </div>
  );
}
