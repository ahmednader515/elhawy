import { INTRO_COOKIE_NAME } from "@/lib/introImages";

const INTRO_SESSION_KEY = "hawi-intro-completed";
/** Short-lived cookie so middleware allows / right after intro completion. */
const INTRO_COOKIE_MAX_AGE_SEC = 60;

/** Whether the user has already completed the intro in this tab. */
export function hasIntroBeenCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

/** Mark the intro as completed for this tab (survives refresh; new tabs see the intro again). */
export function markIntroCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INTRO_SESSION_KEY, "true");
  } catch {
    // ignore storage errors (private mode, etc.)
  }
  try {
    document.cookie = `${INTRO_COOKIE_NAME}=1; path=/; Max-Age=${INTRO_COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
  } catch {
    // ignore cookie errors
  }
}

/** Remove legacy/stale completion cookie. */
export function clearIntroCompletedCookie(): void {
  if (typeof window === "undefined") return;
  try {
    document.cookie = `${INTRO_COOKIE_NAME}=; path=/; Max-Age=0; SameSite=Lax`;
  } catch {
    // ignore cookie errors
  }
}
