/**
 * Static gothic decor for the classic hero: a large, partially-hidden glowing
 * moon (top-left, cropped to the disc) with rotating light rays radiating from
 * its center, plus skeleton figures along the hero base.
 *
 * Note: /intro/moon.png is a wide image (2123x741) with the moon disc centered
 * and lots of transparent padding, so we crop to the disc inside .home-moon-disc.
 */
export function HomeHeroDecor() {
  return (
    <div className="home-hero-decor" aria-hidden>
      <div className="home-moon-wrap">
        <div className="home-moon-halo" />
        <div className="home-moon-rays" />
        <div className="home-moon-disc">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/intro/moon.png" alt="" aria-hidden />
        </div>
      </div>

      <div className="home-hero-skeletons" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="home-hero-skeleton home-hero-skeleton--left" src="/intro/skeleton-run.png" alt="" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="home-hero-skeleton home-hero-skeleton--right" src="/intro/skeleton.png" alt="" aria-hidden />
      </div>
    </div>
  );
}
