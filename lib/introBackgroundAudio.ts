const BACKGROUND_SRC = "/intro/audio/background.mp3";
const BACKGROUND_VOLUME = 0.45;
const MUTE_STORAGE_KEY = "hawi-background-muted";

let htmlAudio: HTMLAudioElement | null = null;
let interactionBound = false;
let isPlaying = false;
let isMuted = false;
let mutedInitialized = false;
const muteListeners = new Set<() => void>();

function initMutedFromStorage(): void {
  if (mutedInitialized || typeof window === "undefined") return;
  mutedInitialized = true;
  try {
    isMuted = localStorage.getItem(MUTE_STORAGE_KEY) === "true";
  } catch {
    isMuted = false;
  }
}

function emitMuteChange(): void {
  muteListeners.forEach((listener) => listener());
}

function getHtmlAudio(): HTMLAudioElement {
  if (!htmlAudio) {
    htmlAudio = new Audio(BACKGROUND_SRC);
    htmlAudio.loop = true;
    htmlAudio.preload = "auto";
  }
  return htmlAudio;
}

function syncVolume(): void {
  initMutedFromStorage();
  const audio = getHtmlAudio();
  audio.volume = isMuted ? 0 : BACKGROUND_VOLUME;
}

export function subscribeIntroBackgroundMuted(listener: () => void): () => void {
  muteListeners.add(listener);
  return () => {
    muteListeners.delete(listener);
  };
}

export function getIntroBackgroundMuted(): boolean {
  initMutedFromStorage();
  return isMuted;
}

export function setIntroBackgroundMuted(muted: boolean): void {
  initMutedFromStorage();
  if (isMuted === muted) return;
  isMuted = muted;
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
  } catch {
    // ignore storage errors
  }
  syncVolume();
  emitMuteChange();
}

export function toggleIntroBackgroundMuted(): boolean {
  setIntroBackgroundMuted(!getIntroBackgroundMuted());
  return isMuted;
}

function playHtmlAudio(): Promise<void> {
  const audio = getHtmlAudio();
  syncVolume();
  return audio
    .play()
    .then(() => {
      isPlaying = true;
    })
    .catch(() => {
      isPlaying = false;
    });
}

function bindInteraction(): void {
  if (interactionBound) return;
  interactionBound = true;

  const onGesture = () => {
    void playHtmlAudio();
  };

  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);
  window.addEventListener("touchstart", onGesture, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isPlaying) {
      void playHtmlAudio();
    }
  });
}

/** Warm the MP3 cache without starting playback (no AudioContext needed). */
export function preloadIntroBackgroundAudio(): void {
  if (typeof window === "undefined") return;
  const audio = getHtmlAudio();
  audio.load();
}

/** Start (or resume) background music. Safe to call repeatedly. */
export function ensureIntroBackgroundPlaying(): void {
  if (typeof window === "undefined") return;
  bindInteraction();
  if (!isPlaying) {
    void playHtmlAudio();
  }
}

/**
 * Start playback inside a user-gesture handler (click/tap on the ready button).
 */
export function unlockIntroBackgroundAudio(): void {
  if (typeof window === "undefined") return;
  bindInteraction();
  void playHtmlAudio();
}

export function disposeIntroBackground(): void {
  if (htmlAudio) {
    htmlAudio.pause();
    htmlAudio.currentTime = 0;
  }
  isPlaying = false;
}

/** Inline bootstrap — preloads the audio file as early as possible in <head>. */
export const INTRO_BACKGROUND_BOOTSTRAP = `(function(){
  var path=(window.location.pathname||"/").replace(/\\/$/,"")||"/";
  if(path!=="/intro"&&path!=="/")return;
  try{
    var l=document.createElement("link");
    l.rel="preload";
    l.as="audio";
    l.href="/intro/audio/background.mp3";
    document.head.appendChild(l);
  }catch(e){}
})();`;
