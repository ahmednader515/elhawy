"use client";

import { useState } from "react";
import { IntroGate } from "@/components/IntroGate";

/**
 * Fullscreen intro overlay for the homepage.
 * Shown on every visit; dismissed after the gate sequence completes.
 */
export function IntroGateOverlay() {
  const [showIntro, setShowIntro] = useState(true);

  if (!showIntro) return null;

  return <IntroGate onComplete={() => setShowIntro(false)} />;
}
