export const GAMIFICATION_XP_UPDATED_EVENT = "gamification-xp-updated";

export function notifyGamificationXpUpdated(xp: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GAMIFICATION_XP_UPDATED_EVENT, { detail: { xp } }));
}
