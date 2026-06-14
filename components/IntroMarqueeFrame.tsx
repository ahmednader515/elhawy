"use client";

import type { ReactNode } from "react";
import { Aref_Ruqaa_Ink } from "next/font/google";

const arefRuqaa = Aref_Ruqaa_Ink({
  subsets: ["arabic"],
  weight: ["700"],
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

type IntroMarqueeFrameProps = {
  children: ReactNode;
  className?: string;
};

/** The lit cinema-marquee frame. Pass the inner content as children. */
export function IntroMarqueeFrame({ children, className = "" }: IntroMarqueeFrameProps) {
  let order = 0;
  const topIndices = Array.from({ length: ROW_BULBS }, () => order++);
  const rightIndices = Array.from({ length: COL_BULBS }, () => order++);
  const bottomIndices = Array.from({ length: ROW_BULBS }, () => order++).reverse();
  const leftIndices = Array.from({ length: COL_BULBS }, () => order++).reverse();

  return (
    <div className={`intro-sign ${arefRuqaa.className} ${className}`}>
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

        <div className="intro-sign-inner">{children}</div>
      </div>
    </div>
  );
}
