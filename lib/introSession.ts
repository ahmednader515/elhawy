const INTRO_SESSION_KEY = "hawi-intro-completed";

/** Whether the user has already completed the intro this browser session. */
export function hasIntroBeenCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

/** Mark the intro as completed for this browser session (survives refresh, not new tabs/sessions). */
export function markIntroCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INTRO_SESSION_KEY, "true");
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}
