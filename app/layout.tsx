import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { StoreSplashProvider } from "@/components/StoreSplashProvider";
import { ForceLogoutGuard } from "@/components/ForceLogoutGuard";
import { MagicCursor } from "@/components/MagicCursor";
import { BackgroundMusicMute } from "@/components/BackgroundMusicMute";
import { getHomepageSettings } from "@/lib/db";
import { normalizeHeroHex } from "@/lib/hero-bg";
import { getDir, makeTranslator } from "@/lib/i18n/core";
import { getLocaleFromCookie } from "@/lib/i18n/server";
import { LocaleProvider } from "@/components/LocaleProvider";
import { pickLocalizedText } from "@/lib/i18n/localized-field";
import { INTRO_BACKGROUND_BOOTSTRAP } from "@/lib/introBackgroundAudio";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromCookie();
  const defaultTitle = "منصتي التعليمية | دورات وتعلم أونلاين";
  const defaultDescription = "منصة تعليمية حديثة لدورات البرمجة والتصميم والتطوير";
  try {
    const settings = await getHomepageSettings();
    const title = pickLocalizedText(locale, settings.pageTitle, settings.pageTitleEn) || defaultTitle;
    return { title, description: defaultDescription };
  } catch {
    return { title: defaultTitle, description: defaultDescription };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocaleFromCookie();
  const dir = getDir(locale);
  let platformPrimaryColor: string | null = null;
  try {
    const settings = await getHomepageSettings();
    platformPrimaryColor = normalizeHeroHex(String(settings.primaryColor ?? "")) ?? null;
  } catch {
    // استخدام اللون الافتراضي
  }

  return (
    <html lang={locale} dir={dir} className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: INTRO_BACKGROUND_BOOTSTRAP,
          }}
        />
        {platformPrimaryColor ? (
          <style
            dangerouslySetInnerHTML={{
              __html: `:root{--platform-primary:${platformPrimaryColor};}`,
            }}
          />
        ) : null}
      </head>
      <body className={`${outfit.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <MagicCursor />
        <NextTopLoader
          color={platformPrimaryColor ?? "#0d9488"}
          height={3}
          showSpinner={false}
          easing="ease"
          speed={300}
          shadow="0 0 10px rgba(13,148,136,0.4)"
        />
        <LocaleProvider locale={locale}>
          <BackgroundMusicMute />
          <SessionProvider>
            <StoreSplashProvider>
              <ForceLogoutGuard />
              {children}
            </StoreSplashProvider>
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
