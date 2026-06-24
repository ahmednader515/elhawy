/** Intro gate scene artwork — shared by preload and scene layers. */
export const INTRO_IMAGES = [
  "/intro/clouds.png",
  "/intro/moon.png",
  "/intro/left-castle.png",
  "/intro/right-castle.png",
  "/intro/left-tree.png",
  "/intro/right-tree.png",
  "/intro/fence.png",
  "/intro/ground.png",
  "/intro/gate-left.png",
  "/intro/gate-right.png",
  "/intro/left-column.png",
  "/intro/right-column.png",
  "/intro/left-flame.png",
  "/intro/right-flame.png",
  "/intro/tombstone.png",
  "/intro/rocks.png",
  "/intro/fog.png",
  "/intro/particles.png",
] as const;

/** Number of `<Image>` instances rendered in IntroSceneLayers. */
export const INTRO_SCENE_IMAGE_COUNT = 21;

export const INTRO_COOKIE_NAME = "hawi-intro-completed";
