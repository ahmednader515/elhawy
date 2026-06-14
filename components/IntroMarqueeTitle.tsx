"use client";

import { El_Messiri } from "next/font/google";
import { IntroMarqueeFrame } from "@/components/IntroMarqueeFrame";

const elMessiri = El_Messiri({
  subsets: ["arabic"],
  weight: ["400", "500"],
  display: "swap",
});

export function IntroMarqueeTitle() {
  return (
    <IntroMarqueeFrame>
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
        حيث تبدأ رحلتك في عالم المعرفة
      </p>
    </IntroMarqueeFrame>
  );
}
