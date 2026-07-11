"use client";

import { useEffect } from "react";

/**
 * Pauses decorative hero animations when the section is off-screen so scroll
 * position does not keep burning GPU while the user interacts elsewhere.
 */
export function HeroSectionAnimator() {
  useEffect(() => {
    const section = document.querySelector(".hero-saas");
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        section.classList.toggle("hero-saas--offscreen", !entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return null;
}
