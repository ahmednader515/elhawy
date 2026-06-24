import type { Locale } from "./types";

export function pickLocalizedText(
  _locale: Locale,
  arabicValue: string | null | undefined,
  englishValue?: string | null | undefined,
): string {
  const ar = (arabicValue ?? "").trim();
  const en = (englishValue ?? "").trim();
  return ar || en;
}
