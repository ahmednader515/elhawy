export const LUCK_WHEEL_SEGMENT_KEYS = [
  "discount_25",
  "discount_50",
  "discount_75",
  "discount_100",
  "try_again",
  "win_150",
  "surprise",
  "good_luck",
] as const;

export type LuckWheelSegmentKey = (typeof LUCK_WHEEL_SEGMENT_KEYS)[number];

export type LuckWheelSegment = {
  key: LuckWheelSegmentKey;
  labelAr: string;
  labelEn: string;
  color: string;
  textColor: string;
};

/** 8 equal slices — display-only prizes */
export const LUCK_WHEEL_SEGMENTS: LuckWheelSegment[] = [
  {
    key: "discount_25",
    labelAr: "خصم 25%",
    labelEn: "25% discount",
    color: "#1B6B4A",
    textColor: "#F5F0E6",
  },
  {
    key: "discount_50",
    labelAr: "خصم 50%",
    labelEn: "50% discount",
    color: "#C45C26",
    textColor: "#FFF8F0",
  },
  {
    key: "discount_75",
    labelAr: "خصم 75%",
    labelEn: "75% discount",
    color: "#1E3A5F",
    textColor: "#F5F0E6",
  },
  {
    key: "discount_100",
    labelAr: "خصم 100%",
    labelEn: "100% discount",
    color: "#8B1E3F",
    textColor: "#FFF5F7",
  },
  {
    key: "try_again",
    labelAr: "حاول مرة أخرى",
    labelEn: "Try again",
    color: "#5C6B73",
    textColor: "#F5F0E6",
  },
  {
    key: "win_150",
    labelAr: "اربح 150",
    labelEn: "Win 150",
    color: "#B8860B",
    textColor: "#1A1408",
  },
  {
    key: "surprise",
    labelAr: "مفاجأة 🔥",
    labelEn: "Surprise 🔥",
    color: "#6B2D5B",
    textColor: "#FFF0F8",
  },
  {
    key: "good_luck",
    labelAr: "حظ سعيد",
    labelEn: "Good luck",
    color: "#2F5D50",
    textColor: "#F5F0E6",
  },
];

export function isLuckWheelSegmentKey(value: string): value is LuckWheelSegmentKey {
  return (LUCK_WHEEL_SEGMENT_KEYS as readonly string[]).includes(value);
}

export function getLuckWheelSegmentIndex(key: LuckWheelSegmentKey): number {
  return LUCK_WHEEL_SEGMENTS.findIndex((s) => s.key === key);
}

export function pickRandomLuckWheelSegment(): LuckWheelSegment {
  const index = Math.floor(Math.random() * LUCK_WHEEL_SEGMENTS.length);
  return LUCK_WHEEL_SEGMENTS[index]!;
}

export function getLuckWheelSegmentLabel(
  key: LuckWheelSegmentKey,
  locale: "ar" | "en",
): string {
  const segment = LUCK_WHEEL_SEGMENTS.find((s) => s.key === key);
  if (!segment) return key;
  return locale === "en" ? segment.labelEn : segment.labelAr;
}
