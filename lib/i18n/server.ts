import { DEFAULT_LOCALE } from "./constants";
import { getMessages, makeTranslator, normalizeLocale } from "./core";
import type { Locale } from "./types";

export async function getLocaleFromCookie(): Promise<Locale> {
  return "ar";
}

export async function getServerMessages() {
  return getMessages(await getLocaleFromCookie());
}

export async function getServerTranslator() {
  return makeTranslator(await getLocaleFromCookie());
}
