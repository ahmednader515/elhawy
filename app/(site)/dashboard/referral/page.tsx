import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { ReferralFormClient } from "@/components/dashboard/ReferralFormClient";

export default async function StudentReferralPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const t = await getServerTranslator();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← {t("dashboard.title", "Dashboard")}
        </Link>
        <h2 className="mt-3 text-xl font-semibold text-[var(--color-foreground)]">
          {t("dashboard.referral.pageTitle", "Invite a friend")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t("dashboard.referral.pageIntro", "Tell us who invited you to subscribe. Points are awarded to your friend after admin review.")}
        </p>
      </div>
      <ReferralFormClient />
    </div>
  );
}
