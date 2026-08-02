import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "./client";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { HomepageSetting, PlatformDetailsItem } from "@/lib/types";
import {
  HOMEPAGE_DEFAULT_CTA_BADGE_AR,
  HOMEPAGE_DEFAULT_CTA_BUTTON_AR,
  HOMEPAGE_DEFAULT_CTA_DESCRIPTION_AR,
  HOMEPAGE_DEFAULT_CTA_TITLE_AR,
  HOMEPAGE_DEFAULT_FOOTER_COPYRIGHT_AR,
  HOMEPAGE_DEFAULT_FOOTER_TAGLINE_AR,
  HOMEPAGE_DEFAULT_FOOTER_TITLE_AR,
  HOMEPAGE_DEFAULT_HERO3_SUBTITLE_AR,
  HOMEPAGE_DEFAULT_HERO3_TITLE_AR,
  HOMEPAGE_DEFAULT_HERO_SLOGAN_AR,
  HOMEPAGE_DEFAULT_HERO_TITLE_AR,
  HOMEPAGE_DEFAULT_PAGE_TITLE_AR,
  HOMEPAGE_DEFAULT_PLATFORM_DETAILS_SUBTITLE_AR,
  HOMEPAGE_DEFAULT_PLATFORM_DETAILS_TITLE_AR,
  HOMEPAGE_DEFAULT_PLATFORM_NAME_AR,
  HOMEPAGE_DEFAULT_PLATFORM_NEWS_TITLE_AR,
  HOMEPAGE_DEFAULT_REVIEWS_SECTION_SUBTITLE_AR,
  HOMEPAGE_DEFAULT_REVIEWS_SECTION_TITLE_AR,
  HOMEPAGE_DEFAULT_SOCIAL_LEFT_LABEL_AR,
  HOMEPAGE_DEFAULT_SOCIAL_RIGHT_LABEL_AR,
  HOMEPAGE_DEFAULT_STORE_SECTION_DESCRIPTION_AR,
  HOMEPAGE_DEFAULT_STORE_SECTION_TITLE_AR,
} from "@/lib/homepage-known-defaults";

/**
 * كانت هذه دوالاً تضيف أعمدة ALTER TABLE ... IF NOT EXISTS عند استخدام SQL الخام.
 * مع Prisma كل أعمدة HomepageSetting موجودة بالفعل في المخطط، فلا حاجة لها.
 * أُبقيت بلا محتوى (NO-OP) فقط لتوافق أي استدعاء قديم.
 */
async function ensureHomepageColumnsNoop(): Promise<void> {
  // NO-OP
}
export const ensureHomepageHeroTemplateColumns = ensureHomepageColumnsNoop;
export const ensureHomepageHeroSliderCourseIdColumns = ensureHomepageColumnsNoop;
export const ensureHomepageReviewsSectionCopyColumns = ensureHomepageColumnsNoop;
export const ensureHomepageHeroCustomBgColumns = ensureHomepageColumnsNoop;
export const ensureAddBalanceSettingsColumns = ensureHomepageColumnsNoop;
export const ensureHomepageStoreEnabledColumn = ensureHomepageColumnsNoop;
export const ensureHomepageLuckWheelEnabledColumn = ensureHomepageColumnsNoop;
export const ensureHomepageStoreSectionCopyColumns = ensureHomepageColumnsNoop;
export const ensureHomepagePrimaryColorColumn = ensureHomepageColumnsNoop;
export const ensureHomepageHeaderLogoColumn = ensureHomepageColumnsNoop;
export const ensureHomepageTeamSupportLinksColumns = ensureHomepageColumnsNoop;
export const ensureHomepageCtaCopyColumns = ensureHomepageColumnsNoop;
export const ensureHomepageBilingualTextColumns = ensureHomepageColumnsNoop;
export const ensureHomepagePlatformDetailsColumns = ensureHomepageColumnsNoop;
export const ensureHomepagePlatformNewsColumns = ensureHomepageColumnsNoop;
export const ensureHomepageCopyrightOverlayColumns = ensureHomepageColumnsNoop;
export const ensureHomepageTeachersEnabledColumn = ensureHomepageColumnsNoop;
export const ensureHomepageSubscriptionsEnabledColumn = ensureHomepageColumnsNoop;

// ----- HomepageSetting (إعدادات الصفحة الرئيسية) -----
const HOMEPAGE_DEFAULTS: HomepageSetting = {
  heroTemplate: "classic",
  teacherImageUrl: "/instructor.png",
  heroTitle: HOMEPAGE_DEFAULT_HERO_TITLE_AR,
  heroTitleEn: null,
  heroSlogan: HOMEPAGE_DEFAULT_HERO_SLOGAN_AR,
  heroSloganEn: null,
  platformName: HOMEPAGE_DEFAULT_PLATFORM_NAME_AR,
  platformNameEn: null,
  headerLogoUrl: null,
  primaryColor: null,
  youtubeUrl: null,
  linkedinUrl: null,
  whatsappUrl: "https://wa.me/966553612356",
  facebookUrl: "https://www.facebook.com/profile.php?id=61562686209159",
  telegramUrl: null,
  teamYoutubeUrl: null,
  teamLinkedinUrl: null,
  teamWhatsappUrl: null,
  teamFacebookUrl: null,
  teamTelegramUrl: null,
  socialRightLabel: HOMEPAGE_DEFAULT_SOCIAL_RIGHT_LABEL_AR,
  socialRightLabelEn: null,
  socialLeftLabel: HOMEPAGE_DEFAULT_SOCIAL_LEFT_LABEL_AR,
  socialLeftLabelEn: null,
  socialLeftEnabled: true,
  pageTitle: HOMEPAGE_DEFAULT_PAGE_TITLE_AR,
  pageTitleEn: null,
  heroBgPreset: "navy",
  heroBgCustomFrom: null,
  heroBgCustomTo: null,
  heroFloatImage1: "/images/ruler.png",
  heroFloatImage2: "/images/notebook.png",
  heroFloatImage3: "/images/pencil.png",
  heroSliderImage1: null,
  heroSliderImage2: null,
  heroSliderImage3: null,
  heroSliderImage4: null,
  heroSliderImage5: null,
  heroSliderCourseId1: null,
  heroSliderCourseId2: null,
  heroSliderCourseId3: null,
  heroSliderCourseId4: null,
  heroSliderCourseId5: null,
  heroSliderIntervalMs: 5000,
  hero3Title: HOMEPAGE_DEFAULT_HERO3_TITLE_AR,
  hero3TitleEn: null,
  hero3Subtitle: HOMEPAGE_DEFAULT_HERO3_SUBTITLE_AR,
  hero3SubtitleEn: null,
  hero3PhoneImageUrl: null,
  hero3PhoneBgColor: "#FACC15",
  hero3StoreBadge1ImageUrl: null,
  hero3StoreBadge1Link: null,
  hero3StoreBadge2ImageUrl: null,
  hero3StoreBadge2Link: null,
  footerTitle: HOMEPAGE_DEFAULT_FOOTER_TITLE_AR,
  footerTitleEn: null,
  footerTagline: HOMEPAGE_DEFAULT_FOOTER_TAGLINE_AR,
  footerTaglineEn: null,
  footerCopyright: HOMEPAGE_DEFAULT_FOOTER_COPYRIGHT_AR,
  footerCopyrightEn: null,
  reviewsSectionTitle: HOMEPAGE_DEFAULT_REVIEWS_SECTION_TITLE_AR,
  reviewsSectionTitleEn: null,
  reviewsSectionSubtitle: HOMEPAGE_DEFAULT_REVIEWS_SECTION_SUBTITLE_AR,
  reviewsSectionSubtitleEn: null,
  ctaBadgeText: HOMEPAGE_DEFAULT_CTA_BADGE_AR,
  ctaBadgeTextEn: null,
  ctaTitle: HOMEPAGE_DEFAULT_CTA_TITLE_AR,
  ctaTitleEn: null,
  ctaDescription: HOMEPAGE_DEFAULT_CTA_DESCRIPTION_AR,
  ctaDescriptionEn: null,
  ctaButtonText: HOMEPAGE_DEFAULT_CTA_BUTTON_AR,
  ctaButtonTextEn: null,
  teachersEnabled: false,
  subscriptionsEnabled: false,
  storeEnabled: false,
  luckWheelEnabled: false,
  storeSectionTitle: HOMEPAGE_DEFAULT_STORE_SECTION_TITLE_AR,
  storeSectionTitleEn: null,
  storeSectionDescription: HOMEPAGE_DEFAULT_STORE_SECTION_DESCRIPTION_AR,
  storeSectionDescriptionEn: null,
  platformDetailsEnabled: false,
  platformDetailsTitle: HOMEPAGE_DEFAULT_PLATFORM_DETAILS_TITLE_AR,
  platformDetailsTitleEn: null,
  platformDetailsSubtitle: HOMEPAGE_DEFAULT_PLATFORM_DETAILS_SUBTITLE_AR,
  platformDetailsSubtitleEn: null,
  platformDetailsBackgroundColor: null,
  platformDetailsItems: JSON.stringify([
    {
      id: "platform-detail-1",
      title: "فصول افتراضية فورية",
      description: "تصميم الفصول والمعلومات خلال الفصول الافتراضية.",
      iconType: "preset",
      presetIcon: "book",
      customIconUrl: null,
    },
    {
      id: "platform-detail-2",
      title: "محتوى جذاب في دقائق",
      description: "تصميم وإنشاء المحتوى التعليمي بشكل سريع ومميز.",
      iconType: "preset",
      presetIcon: "pencil",
      customIconUrl: null,
    },
    {
      id: "platform-detail-3",
      title: "أنشطة وفعاليات رائعة",
      description: "تجذب الطلاب وتنشئ تفاعلهم بعد أو داخل الصف الدراسي.",
      iconType: "preset",
      presetIcon: "bulb",
      customIconUrl: null,
    },
    {
      id: "platform-detail-4",
      title: "تواصل فعال",
      description: "أدوات للتواصل والتعاون الفعال بين كل أطراف العملية التعليمية.",
      iconType: "preset",
      presetIcon: "chat",
      customIconUrl: null,
    },
  ] satisfies PlatformDetailsItem[]),
  platformNewsEnabled: false,
  platformNewsItems: "[]",
  platformNewsSectionTitle: HOMEPAGE_DEFAULT_PLATFORM_NEWS_TITLE_AR,
  platformNewsSectionTitleEn: null,
  addBalanceTitle: "إضافة رصيد",
  addBalanceTitleEn: null,
  addBalanceSubtitle: "اختر طريقة الدفع ثم اتبع التعليمات",
  addBalanceSubtitleEn: null,
  addBalanceMethodTitle: "فودافون كاش",
  addBalanceMethodTitleEn: null,
  addBalanceTransferInstruction: "قم بتحويل المبلغ المطلوب إلى رقم المحفظة التالي:",
  addBalanceTransferInstructionEn: null,
  addBalanceWalletNumber: "01023005622",
  addBalanceConfirmationNote:
    "بعد التحويل، يجب إرسال صورة تأكيد التحويل على واتساب على الرقم",
  addBalanceConfirmationNoteEn: null,
  addBalanceWhatsappNumber: "966553612356",
  addBalanceWhatsappButtonText: "إرسال صورة التأكيد على واتساب",
  addBalanceWhatsappButtonTextEn: null,
  addBalanceWaitingNote:
    "بعد إرسال صورة التأكيد، يكون رصيدك في انتظار وصوله إلى حسابك. سيتم إضافة الرصيد خلال أقرب وقت.",
  addBalanceWaitingNoteEn: null,
  copyrightOverlayStyle: "floating",
};

function trimmedOrNull(v: unknown, maxLen?: number): string | null {
  const s = v != null ? String(v).trim() : "";
  if (s.length === 0) return null;
  return maxLen != null ? s.slice(0, maxLen) : s;
}

function trimmedOrDefault(v: unknown, maxLen: number, fallback: string | null): string | null {
  const s = v != null ? String(v).trim() : "";
  if (s.length > 0) return s.slice(0, maxLen);
  return fallback ?? null;
}

type HomepageSettingDbRow = NonNullable<Awaited<ReturnType<typeof prisma.homepageSetting.findUnique>>>;

async function getHomepageSettingsUncached(): Promise<HomepageSetting> {
  try {
    const row = await prisma.homepageSetting.findUnique({ where: { id: "default" } });
    if (!row) return HOMEPAGE_DEFAULTS;
    return mapHomepageSettingsRow(row);
  } catch {
    return HOMEPAGE_DEFAULTS;
  }
}

function mapHomepageSettingsRow(row: HomepageSettingDbRow): HomepageSetting {
  const heroFloat1 = trimmedOrNull(row.hero_float_image_1);
  const heroFloat2 = trimmedOrNull(row.hero_float_image_2);
  const heroFloat3 = trimmedOrNull(row.hero_float_image_3);

  const sliderIntervalNum = Number(row.hero_slider_interval_ms);
  const heroSliderIntervalMs =
    Number.isFinite(sliderIntervalNum) && sliderIntervalNum >= 1500 && sliderIntervalNum <= 20000
      ? Math.round(sliderIntervalNum)
      : (HOMEPAGE_DEFAULTS.heroSliderIntervalMs ?? 5000);

  return {
    heroTemplate: (() => {
      const s = row.hero_template != null ? String(row.hero_template).trim() : "";
      if (s === "classic" || s === "image_slider" || s === "coming_soon") return s;
      return HOMEPAGE_DEFAULTS.heroTemplate ?? "classic";
    })(),
    teacherImageUrl: row.teacher_image_url ?? HOMEPAGE_DEFAULTS.teacherImageUrl,
    heroTitle: row.hero_title ?? HOMEPAGE_DEFAULTS.heroTitle,
    heroTitleEn: trimmedOrNull(row.hero_title_en, 300),
    heroSlogan: row.hero_slogan ?? HOMEPAGE_DEFAULTS.heroSlogan,
    heroSloganEn: trimmedOrNull(row.hero_slogan_en, 600),
    platformName:
      row.platform_name != null && String(row.platform_name).trim() !== ""
        ? String(row.platform_name).trim()
        : null,
    platformNameEn: trimmedOrNull(row.platform_name_en, 200),
    headerLogoUrl: trimmedOrNull(row.header_logo_url, 4000),
    primaryColor: trimmedOrNull(row.primary_color, 16),
    /* لا نستخدم الافتراضي عند الحذف — لو القيمة null أو فارغة نرجع null حتى يختفي الزر */
    youtubeUrl: trimmedOrNull(row.youtube_url, 4000),
    linkedinUrl: trimmedOrNull(row.linkedin_url, 4000),
    whatsappUrl:
      row.whatsapp_url != null && String(row.whatsapp_url).trim() !== ""
        ? String(row.whatsapp_url).trim()
        : null,
    facebookUrl:
      row.facebook_url != null && String(row.facebook_url).trim() !== ""
        ? String(row.facebook_url).trim()
        : null,
    telegramUrl: trimmedOrNull(row.telegram_url, 4000),
    teamYoutubeUrl: trimmedOrNull(row.team_youtube_url, 4000),
    teamLinkedinUrl: trimmedOrNull(row.team_linkedin_url, 4000),
    teamWhatsappUrl: trimmedOrNull(row.team_whatsapp_url, 4000),
    teamFacebookUrl: trimmedOrNull(row.team_facebook_url, 4000),
    teamTelegramUrl: trimmedOrNull(row.team_telegram_url, 4000),
    socialRightLabel: trimmedOrDefault(row.social_right_label, 120, HOMEPAGE_DEFAULTS.socialRightLabel ?? "الدعم"),
    socialRightLabelEn: trimmedOrNull(row.social_right_label_en, 120),
    socialLeftLabel: trimmedOrDefault(row.social_left_label, 120, HOMEPAGE_DEFAULTS.socialLeftLabel ?? "دعم الفريق"),
    socialLeftLabelEn: trimmedOrNull(row.social_left_label_en, 120),
    socialLeftEnabled: row.social_left_enabled === null || row.social_left_enabled === undefined
      ? true
      : Boolean(row.social_left_enabled),
    pageTitle: row.page_title ?? HOMEPAGE_DEFAULTS.pageTitle,
    pageTitleEn: trimmedOrNull(row.page_title_en, 300),
    heroBgPreset: row.hero_bg_preset ?? HOMEPAGE_DEFAULTS.heroBgPreset,
    heroBgCustomFrom: trimmedOrNull(row.hero_bg_custom_from, 16),
    heroBgCustomTo: trimmedOrNull(row.hero_bg_custom_to, 16),
    heroFloatImage1: heroFloat1 ?? HOMEPAGE_DEFAULTS.heroFloatImage1,
    heroFloatImage2: heroFloat2 ?? HOMEPAGE_DEFAULTS.heroFloatImage2,
    heroFloatImage3: heroFloat3 ?? HOMEPAGE_DEFAULTS.heroFloatImage3,
    heroSliderImage1: trimmedOrNull(row.hero_slider_image_1, 4000),
    heroSliderImage2: trimmedOrNull(row.hero_slider_image_2, 4000),
    heroSliderImage3: trimmedOrNull(row.hero_slider_image_3, 4000),
    heroSliderImage4: trimmedOrNull(row.hero_slider_image_4, 4000),
    heroSliderImage5: trimmedOrNull(row.hero_slider_image_5, 4000),
    heroSliderCourseId1: trimmedOrNull(row.hero_slider_course_id_1, 128),
    heroSliderCourseId2: trimmedOrNull(row.hero_slider_course_id_2, 128),
    heroSliderCourseId3: trimmedOrNull(row.hero_slider_course_id_3, 128),
    heroSliderCourseId4: trimmedOrNull(row.hero_slider_course_id_4, 128),
    heroSliderCourseId5: trimmedOrNull(row.hero_slider_course_id_5, 128),
    heroSliderIntervalMs,
    hero3Title: trimmedOrDefault(row.hero3_title, 300, HOMEPAGE_DEFAULTS.hero3Title ?? null),
    hero3TitleEn: trimmedOrNull(row.hero3_title_en, 300),
    hero3Subtitle: trimmedOrDefault(row.hero3_subtitle, 600, HOMEPAGE_DEFAULTS.hero3Subtitle ?? null),
    hero3SubtitleEn: trimmedOrNull(row.hero3_subtitle_en, 600),
    hero3PhoneImageUrl: trimmedOrNull(row.hero3_phone_image_url, 4000),
    hero3PhoneBgColor: trimmedOrDefault(row.hero3_phone_bg_color, 16, HOMEPAGE_DEFAULTS.hero3PhoneBgColor ?? null),
    hero3StoreBadge1ImageUrl: trimmedOrNull(row.hero3_store_badge_1_image_url, 4000),
    hero3StoreBadge1Link: trimmedOrNull(row.hero3_store_badge_1_link, 4000),
    hero3StoreBadge2ImageUrl: trimmedOrNull(row.hero3_store_badge_2_image_url, 4000),
    hero3StoreBadge2Link: trimmedOrNull(row.hero3_store_badge_2_link, 4000),
    footerTitle: row.footer_title ?? HOMEPAGE_DEFAULTS.footerTitle,
    footerTitleEn: trimmedOrNull(row.footer_title_en, 300),
    footerTagline: row.footer_tagline ?? HOMEPAGE_DEFAULTS.footerTagline,
    footerTaglineEn: trimmedOrNull(row.footer_tagline_en, 500),
    footerCopyright: row.footer_copyright ?? HOMEPAGE_DEFAULTS.footerCopyright,
    footerCopyrightEn: trimmedOrNull(row.footer_copyright_en, 500),
    reviewsSectionTitle: trimmedOrDefault(row.reviews_section_title, 400, HOMEPAGE_DEFAULTS.reviewsSectionTitle ?? null),
    reviewsSectionTitleEn: trimmedOrNull(row.reviews_section_title_en, 400),
    reviewsSectionSubtitle: trimmedOrDefault(
      row.reviews_section_subtitle,
      400,
      HOMEPAGE_DEFAULTS.reviewsSectionSubtitle ?? null,
    ),
    reviewsSectionSubtitleEn: trimmedOrNull(row.reviews_section_subtitle_en, 400),
    ctaBadgeText: trimmedOrDefault(row.cta_badge_text, 120, HOMEPAGE_DEFAULTS.ctaBadgeText ?? null),
    ctaBadgeTextEn: trimmedOrNull(row.cta_badge_text_en, 120),
    ctaTitle: trimmedOrDefault(row.cta_title, 300, HOMEPAGE_DEFAULTS.ctaTitle ?? null),
    ctaTitleEn: trimmedOrNull(row.cta_title_en, 300),
    ctaDescription: trimmedOrDefault(row.cta_description, 2000, HOMEPAGE_DEFAULTS.ctaDescription ?? null),
    ctaDescriptionEn: trimmedOrNull(row.cta_description_en, 2000),
    ctaButtonText: trimmedOrDefault(row.cta_button_text, 120, HOMEPAGE_DEFAULTS.ctaButtonText ?? null),
    ctaButtonTextEn: trimmedOrNull(row.cta_button_text_en, 120),
    teachersEnabled: Boolean(row.teachers_enabled),
    subscriptionsEnabled: Boolean(row.subscriptions_enabled),
    storeEnabled: Boolean(row.store_enabled),
    luckWheelEnabled: Boolean(row.luck_wheel_enabled),
    storeSectionTitle: trimmedOrDefault(row.store_section_title, 400, HOMEPAGE_DEFAULTS.storeSectionTitle ?? "متجر المنصة"),
    storeSectionTitleEn: trimmedOrNull(row.store_section_title_en, 400),
    storeSectionDescription: trimmedOrDefault(
      row.store_section_description,
      2000,
      HOMEPAGE_DEFAULTS.storeSectionDescription ?? null,
    ),
    storeSectionDescriptionEn: trimmedOrNull(row.store_section_description_en, 2000),
    platformDetailsEnabled: Boolean(row.platform_details_enabled),
    platformDetailsTitle: trimmedOrDefault(
      row.platform_details_title,
      240,
      HOMEPAGE_DEFAULTS.platformDetailsTitle ?? null,
    ),
    platformDetailsTitleEn: trimmedOrNull(row.platform_details_title_en, 240),
    platformDetailsSubtitle: trimmedOrDefault(
      row.platform_details_subtitle,
      500,
      HOMEPAGE_DEFAULTS.platformDetailsSubtitle ?? null,
    ),
    platformDetailsSubtitleEn: trimmedOrNull(row.platform_details_subtitle_en, 500),
    platformDetailsBackgroundColor: trimmedOrDefault(
      row.platform_details_background_color,
      16,
      HOMEPAGE_DEFAULTS.platformDetailsBackgroundColor ?? null,
    ),
    platformDetailsItems: trimmedOrDefault(row.platform_details_items, 12000, HOMEPAGE_DEFAULTS.platformDetailsItems ?? "[]"),
    platformNewsEnabled: Boolean(row.platform_news_enabled),
    platformNewsItems: trimmedOrDefault(row.platform_news_items, 12000, HOMEPAGE_DEFAULTS.platformNewsItems ?? "[]"),
    platformNewsSectionTitle: trimmedOrDefault(
      row.platform_news_section_title,
      240,
      HOMEPAGE_DEFAULTS.platformNewsSectionTitle ?? "أخبار المنصة",
    ),
    platformNewsSectionTitleEn: trimmedOrNull(row.platform_news_section_title_en, 240),
    addBalanceTitle: row.add_balance_title ?? HOMEPAGE_DEFAULTS.addBalanceTitle,
    addBalanceTitleEn: trimmedOrNull(row.add_balance_title_en, 300),
    addBalanceSubtitle: row.add_balance_subtitle ?? HOMEPAGE_DEFAULTS.addBalanceSubtitle,
    addBalanceSubtitleEn: trimmedOrNull(row.add_balance_subtitle_en, 600),
    addBalanceMethodTitle: row.add_balance_method_title ?? HOMEPAGE_DEFAULTS.addBalanceMethodTitle,
    addBalanceMethodTitleEn: trimmedOrNull(row.add_balance_method_title_en, 300),
    addBalanceTransferInstruction:
      row.add_balance_transfer_instruction ?? HOMEPAGE_DEFAULTS.addBalanceTransferInstruction,
    addBalanceTransferInstructionEn: trimmedOrNull(row.add_balance_transfer_instruction_en, 1000),
    addBalanceWalletNumber: row.add_balance_wallet_number ?? HOMEPAGE_DEFAULTS.addBalanceWalletNumber,
    addBalanceConfirmationNote:
      row.add_balance_confirmation_note ?? HOMEPAGE_DEFAULTS.addBalanceConfirmationNote,
    addBalanceConfirmationNoteEn: trimmedOrNull(row.add_balance_confirmation_note_en, 1000),
    addBalanceWhatsappNumber: row.add_balance_whatsapp_number ?? HOMEPAGE_DEFAULTS.addBalanceWhatsappNumber,
    addBalanceWhatsappButtonText:
      row.add_balance_whatsapp_button_text ?? HOMEPAGE_DEFAULTS.addBalanceWhatsappButtonText,
    addBalanceWhatsappButtonTextEn: trimmedOrNull(row.add_balance_whatsapp_button_text_en, 200),
    addBalanceWaitingNote: row.add_balance_waiting_note ?? HOMEPAGE_DEFAULTS.addBalanceWaitingNote,
    addBalanceWaitingNoteEn: trimmedOrNull(row.add_balance_waiting_note_en, 1000),
    copyrightOverlayStyle: (() => {
      const s = row.copyright_overlay_style != null ? String(row.copyright_overlay_style).trim().toLowerCase() : "";
      return s === "watermark" ? "watermark" : "floating";
    })(),
  };
}

/** نفس الطلب (layout + metadata + الصفحة) يقرأ الإعدادات مرة واحدة فقط؛ عبر الطلبات يُخزَّن ٦٠ ثانية */
const getHomepageSettingsCrossRequest = unstable_cache(
  async () => getHomepageSettingsUncached(),
  ["homepage-settings-v1"],
  { revalidate: 60, tags: [CACHE_TAGS.homepageSettings] },
);

export const getHomepageSettings = cache(getHomepageSettingsCrossRequest);

export async function updateHomepageSettings(data: {
  hero_template?: string | null;
  teacher_image_url?: string | null;
  hero_title?: string | null;
  hero_title_en?: string | null;
  hero_slogan?: string | null;
  hero_slogan_en?: string | null;
  platform_name?: string | null;
  platform_name_en?: string | null;
  header_logo_url?: string | null;
  primary_color?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
  whatsapp_url?: string | null;
  facebook_url?: string | null;
  telegram_url?: string | null;
  team_youtube_url?: string | null;
  team_linkedin_url?: string | null;
  team_whatsapp_url?: string | null;
  team_facebook_url?: string | null;
  team_telegram_url?: string | null;
  social_right_label?: string | null;
  social_right_label_en?: string | null;
  social_left_label?: string | null;
  social_left_label_en?: string | null;
  social_left_enabled?: boolean;
  page_title?: string | null;
  page_title_en?: string | null;
  hero_bg_preset?: string | null;
  hero_bg_custom_from?: string | null;
  hero_bg_custom_to?: string | null;
  hero_float_image_1?: string | null;
  hero_float_image_2?: string | null;
  hero_float_image_3?: string | null;
  hero_slider_image_1?: string | null;
  hero_slider_image_2?: string | null;
  hero_slider_image_3?: string | null;
  hero_slider_image_4?: string | null;
  hero_slider_image_5?: string | null;
  hero_slider_course_id_1?: string | null;
  hero_slider_course_id_2?: string | null;
  hero_slider_course_id_3?: string | null;
  hero_slider_course_id_4?: string | null;
  hero_slider_course_id_5?: string | null;
  hero_slider_interval_ms?: number | null;
  hero3_title?: string | null;
  hero3_title_en?: string | null;
  hero3_subtitle?: string | null;
  hero3_subtitle_en?: string | null;
  hero3_phone_image_url?: string | null;
  hero3_phone_bg_color?: string | null;
  hero3_store_badge_1_image_url?: string | null;
  hero3_store_badge_1_link?: string | null;
  hero3_store_badge_2_image_url?: string | null;
  hero3_store_badge_2_link?: string | null;
  footer_title?: string | null;
  footer_title_en?: string | null;
  footer_tagline?: string | null;
  footer_tagline_en?: string | null;
  footer_copyright?: string | null;
  footer_copyright_en?: string | null;
  reviews_section_title?: string | null;
  reviews_section_title_en?: string | null;
  reviews_section_subtitle?: string | null;
  reviews_section_subtitle_en?: string | null;
  cta_badge_text?: string | null;
  cta_badge_text_en?: string | null;
  cta_title?: string | null;
  cta_title_en?: string | null;
  cta_description?: string | null;
  cta_description_en?: string | null;
  cta_button_text?: string | null;
  cta_button_text_en?: string | null;
  teachers_enabled?: boolean;
  subscriptions_enabled?: boolean;
  store_enabled?: boolean;
  store_section_title?: string | null;
  store_section_title_en?: string | null;
  store_section_description?: string | null;
  store_section_description_en?: string | null;
  platform_details_enabled?: boolean;
  platform_details_title?: string | null;
  platform_details_title_en?: string | null;
  platform_details_subtitle?: string | null;
  platform_details_subtitle_en?: string | null;
  platform_details_background_color?: string | null;
  platform_details_items?: string | null;
  add_balance_title?: string | null;
  add_balance_title_en?: string | null;
  add_balance_subtitle?: string | null;
  add_balance_subtitle_en?: string | null;
  add_balance_method_title?: string | null;
  add_balance_method_title_en?: string | null;
  add_balance_transfer_instruction?: string | null;
  add_balance_transfer_instruction_en?: string | null;
  add_balance_wallet_number?: string | null;
  add_balance_confirmation_note?: string | null;
  add_balance_confirmation_note_en?: string | null;
  add_balance_whatsapp_number?: string | null;
  add_balance_whatsapp_button_text?: string | null;
  add_balance_whatsapp_button_text_en?: string | null;
  add_balance_waiting_note?: string | null;
  add_balance_waiting_note_en?: string | null;
  copyright_overlay_style?: "floating" | "watermark" | null;
  platform_news_enabled?: boolean;
  platform_news_items?: string | null;
  platform_news_section_title?: string | null;
  platform_news_section_title_en?: string | null;
}): Promise<void> {
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) updateData[key] = value;
  }
  if (Object.keys(updateData).length === 0) return;
  updateData.updated_at = new Date();
  await prisma.homepageSetting.upsert({
    where: { id: "default" },
    create: { id: "default", ...updateData },
    update: updateData,
  });
}

// ----- أعلام الميزات المرتبطة بإعدادات الصفحة الرئيسية -----

export async function getSubscriptionsFeatureEnabled(): Promise<boolean> {
  try {
    const row = await prisma.homepageSetting.findUnique({
      where: { id: "default" },
      select: { subscriptions_enabled: true },
    });
    return !!row?.subscriptions_enabled;
  } catch {
    return false;
  }
}

export async function setSubscriptionsFeatureEnabled(enabled: boolean): Promise<void> {
  await prisma.homepageSetting.upsert({
    where: { id: "default" },
    create: { id: "default", subscriptions_enabled: enabled },
    update: { subscriptions_enabled: enabled, updated_at: new Date() },
  });
}

export async function getStoreFeatureEnabled(): Promise<boolean> {
  try {
    const row = await prisma.homepageSetting.findUnique({
      where: { id: "default" },
      select: { store_enabled: true },
    });
    return !!row?.store_enabled;
  } catch {
    return false;
  }
}

export async function setStoreFeatureEnabled(enabled: boolean): Promise<void> {
  await prisma.homepageSetting.upsert({
    where: { id: "default" },
    create: { id: "default", store_enabled: enabled },
    update: { store_enabled: enabled, updated_at: new Date() },
  });
}

export async function getLuckWheelFeatureEnabled(): Promise<boolean> {
  try {
    const row = await prisma.homepageSetting.findUnique({
      where: { id: "default" },
      select: { luck_wheel_enabled: true },
    });
    return !!row?.luck_wheel_enabled;
  } catch {
    return false;
  }
}

export async function setLuckWheelFeatureEnabled(enabled: boolean): Promise<void> {
  await prisma.homepageSetting.upsert({
    where: { id: "default" },
    create: { id: "default", luck_wheel_enabled: enabled },
    update: { luck_wheel_enabled: enabled, updated_at: new Date() },
  });
}
