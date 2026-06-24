import { getServerSession } from "next-auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { authOptions } from "@/lib/auth";
import {
  getHomepageSettings,
  userHasActivePlatformSubscription,
  getLatestPlatformSubscriptionExpiry,
} from "@/lib/db";
import { normalizeHeroHex } from "@/lib/hero-bg";
import { makeTranslator } from "@/lib/i18n/core";
import { getLocaleFromCookie } from "@/lib/i18n/server";
import { homepageDefaultForLocale } from "@/lib/homepage-default-for-locale";
import { pickLocalizedText } from "@/lib/i18n/localized-field";
import {
  HOMEPAGE_DEFAULT_FOOTER_COPYRIGHT_AR,
  HOMEPAGE_DEFAULT_FOOTER_TAGLINE_AR,
  HOMEPAGE_DEFAULT_FOOTER_TITLE_AR,
} from "@/lib/homepage-known-defaults";

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocaleFromCookie();
  const t = makeTranslator(locale);
  let platformName: string | null = null;
  let headerLogoUrl: string | null = null;
  let platformPrimaryColor: string | null = null;
  let footerTitle = t("footer.defaultTitle", "منصتي التعليمية");
  let footerTagline = t("footer.defaultTagline", "تعلم بأسلوب حديث ومنهجية واضحة");
  let footerCopyright = t("footer.defaultCopyright", "منصتي التعليمية. جميع الحقوق محفوظة.");
  try {
    const settings = await getHomepageSettings();
    platformName = pickLocalizedText(locale, settings.platformName, settings.platformNameEn) || null;
    headerLogoUrl = settings.headerLogoUrl ?? null;
    platformPrimaryColor = normalizeHeroHex(String(settings.primaryColor ?? "")) ?? null;
    const rawFooterTitle = pickLocalizedText(locale, settings.footerTitle, settings.footerTitleEn);
    const rawFooterTagline = pickLocalizedText(locale, settings.footerTagline, settings.footerTaglineEn);
    const rawFooterCopyright = pickLocalizedText(locale, settings.footerCopyright, settings.footerCopyrightEn);
    footerTitle = homepageDefaultForLocale(
      locale,
      rawFooterTitle,
      HOMEPAGE_DEFAULT_FOOTER_TITLE_AR,
      "footer.defaultTitle",
      t,
      "My Learning Platform",
    );
    footerTagline = homepageDefaultForLocale(
      locale,
      rawFooterTagline,
      HOMEPAGE_DEFAULT_FOOTER_TAGLINE_AR,
      "footer.defaultTagline",
      t,
      "Learn with a modern and clear method",
    );
    footerCopyright = homepageDefaultForLocale(
      locale,
      rawFooterCopyright,
      HOMEPAGE_DEFAULT_FOOTER_COPYRIGHT_AR,
      "footer.defaultCopyright",
      t,
      "My Learning Platform. All rights reserved.",
    );
  } catch {
    // استخدام الافتراضي في الهيدر والفوتر
  }

  let platformSubscriptionExpiryLabel: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role === "STUDENT" && session.user.id) {
      const active = await userHasActivePlatformSubscription(session.user.id);
      if (active) {
        const exp = await getLatestPlatformSubscriptionExpiry(session.user.id);
        if (exp) {
          platformSubscriptionExpiryLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(exp);
        } else {
          platformSubscriptionExpiryLabel = t("header.active", "نشط");
        }
      }
    }
  } catch {
    platformSubscriptionExpiryLabel = null;
  }

  return (
    <>
      <Header
        platformName={platformName}
        headerLogoUrl={headerLogoUrl}
        platformSubscriptionExpiryLabel={platformSubscriptionExpiryLabel}
      />
      <main className="flex-1">{children}</main>
      <Footer footerTitle={footerTitle} footerTagline={footerTagline} footerCopyright={footerCopyright} />
    </>
  );
}
