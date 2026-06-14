"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { BatShape } from "@/components/BatShape";

const COVER_MS = 1800;
const REVEAL_MS = 2000;
const TOTAL_MS = COVER_MS + REVEAL_MS;
const BAT_COUNT = 72;

type BatSwarmTransitionProps = {
  /** Fired when the screen is fully black (safe to swap content behind it). */
  onCovered: () => void;
  /** Fired when the swarm has cleared and the reveal is complete. */
  onComplete: () => void;
};

type BatConfig = {
  id: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  bob: number;
  flap: number;
};

function Bat({ config }: { config: BatConfig }) {
  return (
    <motion.div
      className="intro-bat-wrap"
      style={
        {
          top: `${config.top}%`,
          width: config.size,
          height: config.size * 0.45,
          "--flap": `${config.flap}s`,
        } as CSSProperties
      }
      initial={{ x: "-24vw", y: -config.bob }}
      animate={{ x: "124vw", y: config.bob }}
      transition={{
        x: {
          duration: config.duration,
          delay: config.delay,
          ease: "linear",
        },
        y: {
          duration: config.duration / 4,
          delay: config.delay,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
        },
      }}
    >
      <BatShape />
    </motion.div>
  );
}

export function BatSwarmTransition({
  onCovered,
  onComplete,
}: BatSwarmTransitionProps) {
  const coveredRef = useRef(false);
  const completeRef = useRef(false);

  const bats = useMemo<BatConfig[]>(() => {
    return Array.from({ length: BAT_COUNT }, (_, i) => {
      const duration = 1.8 + Math.random() * 1.1;
      // Spread departures so the swarm streams across for the whole transition.
      const delay = (i / BAT_COUNT) * (TOTAL_MS / 1000 - duration * 0.5);
      return {
        id: i,
        top: Math.random() * 92,
        size: 55 + Math.random() * 70,
        duration,
        delay: Math.max(0, delay),
        bob: 10 + Math.random() * 34,
        flap: 0.14 + Math.random() * 0.1,
      };
    });
  }, []);

  useEffect(() => {
    const coverId = window.setTimeout(() => {
      if (coveredRef.current) return;
      coveredRef.current = true;
      onCovered();
    }, COVER_MS);

    const doneId = window.setTimeout(() => {
      if (completeRef.current) return;
      completeRef.current = true;
      onComplete();
    }, TOTAL_MS);

    return () => {
      window.clearTimeout(coverId);
      window.clearTimeout(doneId);
    };
  }, [onCovered, onComplete]);

  return (
    <div className="intro-bats" aria-hidden>
      <motion.div
        className="intro-bats-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          duration: TOTAL_MS / 1000,
          times: [0, COVER_MS / TOTAL_MS, (COVER_MS + 60) / TOTAL_MS, 1],
          ease: "easeInOut",
        }}
      />
      {bats.map((config) => (
        <Bat key={config.id} config={config} />
      ))}
    </div>
  );
}
