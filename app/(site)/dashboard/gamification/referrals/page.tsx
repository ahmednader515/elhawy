import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { ReferralsAdminClient } from "@/components/dashboard/ReferralsAdminClient";

export default async function AdminReferralsPage() {
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
          {t("dashboard.adminReferrals.pageTitle", "Referral requests")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t("dashboard.adminReferrals.pageIntro", "Review student referral forms and award points to referrers.")}
        </p>
      </div>
      <ReferralsAdminClient />
    </div>
  );
}
