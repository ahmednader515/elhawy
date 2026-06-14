"use client";

import { Aref_Ruqaa_Ink, El_Messiri } from "next/font/google";

const arefRuqaa = Aref_Ruqaa_Ink({
  subsets: ["arabic"],
  weight: ["700"],
  display: "swap",
});

const elMessiri = El_Messiri({
  subsets: ["arabic"],
  weight: ["400", "500"],
  display: "swap",
});

const ROW_BULBS = 14;
const COL_BULBS = 4;
const CHASE_STEP_S = 0.085;

function MarqueeBulb({ index }: { index: number }) {
  return (
    <span
      className="intro-sign-bulb"
      style={{ animationDelay: `${index * CHASE_STEP_S}s` }}
      aria-hidden
    />
  );
}

export function IntroMarqueeTitle() {
  let order = 0;

  const topIndices = Array.from({ length: ROW_BULBS }, () => order++);
  const rightIndices = Array.from({ length: COL_BULBS }, () => order++);
  const bottomIndices = Array.from({ length: ROW_BULBS }, () => order++).reverse();
  const leftIndices = Array.from({ length: COL_BULBS }, () => order++).reverse();

  return (
    <div className={`intro-sign ${arefRuqaa.className}`}>
      <div className="intro-sign-frame">
        <div className="intro-sign-bulbs" aria-hidden>
          <div className="intro-sign-bulbs-row intro-sign-bulbs-row--top">
            {topIndices.map((i) => (
              <MarqueeBulb key={`t-${i}`} index={i} />
            ))}
          </div>
          <div className="intro-sign-bulbs-row intro-sign-bulbs-row--bottom">
            {bottomIndices.map((i) => (
              <MarqueeBulb key={`b-${i}`} index={i} />
            ))}
          </div>
          <div className="intro-sign-bulbs-col intro-sign-bulbs-col--left">
            {leftIndices.map((i) => (
              <MarqueeBulb key={`l-${i}`} index={i} />
            ))}
          </div>
          <div className="intro-sign-bulbs-col intro-sign-bulbs-col--right">
            {rightIndices.map((i) => (
              <MarqueeBulb key={`r-${i}`} index={i} />
            ))}
          </div>
        </div>

        <div className="intro-sign-inner">
          <div className="intro-sign-ornament" aria-hidden>
            <span className="intro-sign-ornament-ring" />
            <span className="intro-sign-ornament-core">✦</span>
          </div>

          <h1 className="intro-sign-title">أكاديمية الحاوي</h1>

          <div className={`intro-sign-divider ${elMessiri.className}`} aria-hidden>
            <span className="intro-sign-divider-line" />
            <span className="intro-sign-divider-gem">◆</span>
            <span className="intro-sign-divider-line" />
          </div>

          <p className={`intro-sign-subtitle ${elMessiri.className}`}>
            هل انت مستعد؟
          </p>
        </div>
      </div>
    </div>
  );
}
