import { getGamificationPointRules, updateGamificationPointRules } from "@/lib/db";
import {
  POINT_EVENT,
  POINT_VALUES,
  type PointEventType,
} from "@/lib/gamification-shared";

export type GamificationPointValues = Record<PointEventType, number>;

const ALL_EVENT_TYPES = Object.values(POINT_EVENT) as PointEventType[];

let cache: { values: GamificationPointValues; at: number } | null = null;
const CACHE_MS = 30_000;

function mergeWithDefaults(rules: Partial<Record<string, number>>): GamificationPointValues {
  const merged = { ...POINT_VALUES } as GamificationPointValues;
  for (const key of ALL_EVENT_TYPES) {
    const raw = rules[key];
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
      merged[key] = Math.round(raw);
    }
  }
  return merged;
}

export function invalidateGamificationPointValuesCache() {
  cache = null;
}

export async function getGamificationPointValues(): Promise<GamificationPointValues> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.values;
  }
  const rules = await getGamificationPointRules();
  const values = mergeWithDefaults(rules);
  cache = { values, at: Date.now() };
  return values;
}

export async function saveGamificationPointValues(
  input: Partial<Record<PointEventType, number>>,
): Promise<GamificationPointValues> {
  const normalized: Partial<Record<PointEventType, number>> = {};
  for (const key of ALL_EVENT_TYPES) {
    if (input[key] === undefined) continue;
    const n = Number(input[key]);
    if (!Number.isFinite(n) || n < 0 || n > 10_000) {
      throw new Error(`INVALID_POINTS:${key}`);
    }
    normalized[key] = Math.round(n);
  }
  const saved = await updateGamificationPointRules(normalized);
  const values = mergeWithDefaults(saved);
  cache = { values, at: Date.now() };
  return values;
}

export const GAMIFICATION_POINT_EVENT_TYPES = ALL_EVENT_TYPES;
