const BACKGROUND_SRC = "/intro/audio/background.mp3";
const BACKGROUND_VOLUME = 0.45;

type WindowWithWebkit = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let decodedBuffer: AudioBuffer | null = null;
let bufferPromise: Promise<AudioBuffer | null> | null = null;
let interactionBound = false;
let isPlaying = false;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  if (typeof window === "undefined") return null;

  const Ctor =
    window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
  if (!Ctor) return null;

  audioContext = new Ctor();
  gainNode = audioContext.createGain();
  gainNode.gain.value = BACKGROUND_VOLUME;
  gainNode.connect(audioContext.destination);
  return audioContext;
}

function loadBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
  if (decodedBuffer) return Promise.resolve(decodedBuffer);
  if (bufferPromise) return bufferPromise;

  bufferPromise = fetch(BACKGROUND_SRC)
    .then((res) => res.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buf) => {
      decodedBuffer = buf;
      return buf;
    })
    .catch(() => null);

  return bufferPromise;
}

function startSource(ctx: AudioContext, buf: AudioBuffer): void {
  if (isPlaying && sourceNode) return;
  if (!gainNode) return;

  const source = ctx.createBufferSource();
  source.buffer = buf;
  // Looping a decoded buffer is sample-accurate — no gap between iterations.
  source.loop = true;
  source.connect(gainNode);
  source.start(0);

  sourceNode = source;
  isPlaying = true;
}

async function tryStart(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Browser still requires a user gesture — interaction listeners handle it.
    }
  }

  const buf = await loadBuffer(ctx);
  if (!buf) return;

  if (ctx.state === "running") {
    startSource(ctx, buf);
  }
}

function bindInteraction(): void {
  if (interactionBound) return;
  interactionBound = true;

  const onGesture = () => {
    void tryStart();
  };

  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);
  window.addEventListener("touchstart", onGesture, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void tryStart();
  });
}

/** Start (or resume) the gapless intro background music. Safe to call repeatedly. */
export function ensureIntroBackgroundPlaying(): void {
  if (typeof window === "undefined") return;
  bindInteraction();
  void tryStart();
}

export function disposeIntroBackground(): void {
  if (sourceNode) {
    try {
      sourceNode.stop();
    } catch {
      // already stopped
    }
    sourceNode = null;
  }
  isPlaying = false;
}

/** Inline bootstrap — preloads the audio file as early as possible in <head>. */
export const INTRO_BACKGROUND_BOOTSTRAP = `(function(){
  var path=(window.location.pathname||"/").replace(/\\/$/,"")||"/";
  if(path!=="/")return;
  try{
    var l=document.createElement("link");
    l.rel="preload";
    l.as="audio";
    l.href="/intro/audio/background.mp3";
    document.head.appendChild(l);
  }catch(e){}
})();`;
