"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const GATE_OPEN_DURATION = 2;

/** Stage aspect (16:9). All targets are expressed in % of this stage. */
const STAGE_RATIO = 16 / 9;

type Nat = readonly [number, number];
/** content bounding box as percentages: [left, top, right, bottom] */
type Bbox = readonly [number, number, number, number];
/** desired position of the asset's *content* on the stage */
type Target = { left: number; top: number; width: number };

/**
 * Compute the wrapper style so the asset's visible content lands exactly at
 * `target` on the stage, compensating for transparent padding (bbox).
 */
function place(nat: Nat, bbox: Bbox, target: Target): CSSProperties {
  const contentFracW = (bbox[2] - bbox[0]) / 100;
  const wrapperW = target.width / contentFracW; // % of stage width
  const wrapperH = wrapperW * STAGE_RATIO * (nat[1] / nat[0]); // % of stage height
  const left = target.left - (bbox[0] / 100) * wrapperW;
  const top = target.top - (bbox[1] / 100) * wrapperH;
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${wrapperW}%`,
    aspectRatio: `${nat[0]} / ${nat[1]}`,
  };
}

/**
 * Place a prop into an exact content rectangle (non-uniform). The asset is
 * stretched to fit; used when the source proportions differ from the target
 * (e.g. the slender gate art needs to fill a wider/shorter opening).
 */
function placeRect(
  bbox: Bbox,
  rect: { left: number; top: number; width: number; height: number },
): CSSProperties {
  const contentFracW = (bbox[2] - bbox[0]) / 100;
  const contentFracH = (bbox[3] - bbox[1]) / 100;
  const wrapperW = rect.width / contentFracW;
  const wrapperH = rect.height / contentFracH;
  const left = rect.left - (bbox[0] / 100) * wrapperW;
  const top = rect.top - (bbox[1] / 100) * wrapperH;
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${wrapperW}%`,
    height: `${wrapperH}%`,
  };
}

function Prop({
  src,
  nat,
  bbox,
  target,
  className = "",
  style,
  priority = false,
  flip = false,
}: {
  src: string;
  nat: Nat;
  bbox: Bbox;
  target: Target;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  flip?: boolean;
}) {
  return (
    <div
      className={`intro-prop ${className}`}
      style={{
        ...place(nat, bbox, target),
        ...(flip ? { transform: "scaleX(-1)" } : {}),
        ...style,
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        className="intro-prop-img"
        priority={priority}
        aria-hidden
      />
    </div>
  );
}

type IntroSceneLayersProps = {
  gatesOpen: boolean;
};

export function IntroSceneLayers({ gatesOpen }: IntroSceneLayersProps) {
  return (
    <div className="intro-stage">
      <div className="intro-sky" aria-hidden />

      {/* sky / distance */}
      <Prop
        src="/intro/clouds.png"
        nat={[1672, 941]}
        bbox={[4.1, 18.2, 98, 75.9]}
        target={{ left: 0, top: 2, width: 100 }}
        className="intro-prop--clouds"
      />
      <Prop
        src="/intro/moon.png"
        nat={[2123, 741]}
        bbox={[35.6, 9.4, 64.3, 90.4]}
        target={{ left: 2, top: 3, width: 12 }}
        className="intro-prop--moon"
        priority
      />

      {/* distant castles — towers must clear the foreground rock peaks */}
      <Prop
        src="/intro/left-castle.png"
        nat={[1536, 1024]}
        bbox={[16, 1.5, 87.3, 97.3]}
        target={{ left: -8, top: 20, width: 50 }}
        className="intro-prop--castle"
      />
      <Prop
        src="/intro/right-castle.png"
        nat={[1672, 941]}
        bbox={[27.1, 2.6, 85.4, 92.5]}
        target={{ left: 70, top: 15, width: 40 }}
        className="intro-prop--castle"
      />

      {/* framing trees */}
      <Prop
        src="/intro/left-tree.png"
        nat={[1670, 942]}
        bbox={[24.4, 2.5, 64, 99.7]}
        target={{ left: -3, top: -2, width: 20 }}
        className="intro-prop--tree"
      />
      <Prop
        src="/intro/right-tree.png"
        nat={[1710, 920]}
        bbox={[14.6, 0, 78.8, 99.8]}
        target={{ left: 84, top: 25, width: 20 }}
        className="intro-prop--tree"
      />

      {/* railing behind columns */}
      <Prop
        src="/intro/fence.png"
        nat={[1672, 941]}
        bbox={[7, 25.8, 93.3, 77.8]}
        target={{ left: -2, top: 53, width: 36 }}
        className="intro-prop--fence"
      />
      <Prop
        src="/intro/fence.png"
        nat={[1672, 941]}
        bbox={[7, 25.8, 93.3, 77.8]}
        target={{ left: 66, top: 44, width: 36 }}
        className="intro-prop--fence"
        flip
      />

      {/* ── behind the gate: ground path leading to a distant castle ── */}
      <Prop
        src="/intro/right-castle.png"
        nat={[1672, 941]}
        bbox={[27.1, 2.6, 85.4, 92.5]}
        target={{ left: 30, top: 5, width: 40}}
        className="intro-prop--portal-castle"
      />
      <Prop
        src="/intro/ground.png"
        nat={[1536, 1024]}
        bbox={[0, 47.2, 99.8, 91.4]}
        target={{ left: 30, top: 65, width: 50 }}
        className="intro-prop--portal-ground"
      />

      {/* central gate assembly — scaled down on narrow viewports */}
      <div className="intro-gate-assembly" aria-hidden>
      {/* magical glow effect through the gate gap (CSS, fades on open) */}
      <motion.div
        className="intro-portal-beam intro-blend-screen"
        initial={false}
        animate={{ opacity: gatesOpen ? 0 : 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        aria-hidden
      >
        <span className="intro-portal-beam-shaft" />
        <span className="intro-portal-beam-bloom" />
      </motion.div>

      {/* gate halves — stretched to fill the opening, swing open via skew */}
      <motion.div
        className="intro-prop intro-prop--gate"
        style={{
          ...placeRect([32, 0.4, 64.9, 94.3], {
            left: 33,
            top: 31,
            width: 17,
            height: 48,
          }),
          transformOrigin: "left center",
        }}
        initial={false}
        animate={{
          rotateY: gatesOpen ? 22 : 0,
          skewY: gatesOpen ? 2 : 0,
          transformPerspective: 1100,
        }}
        transition={{ duration: GATE_OPEN_DURATION, ease: [0.33, 0, 0.2, 1] }}
        aria-hidden
      >
        <Image
          src="/intro/gate-left.png"
          alt=""
          fill
          sizes="100vw"
          className="intro-prop-img intro-prop-img--fill"
          priority
          aria-hidden
        />
      </motion.div>
      <motion.div
        className="intro-prop intro-prop--gate"
        style={{
          ...placeRect([37.7, 2.1, 66, 88.2], {
            left: 50.5,
            top: 31,
            width: 17,
            height: 48,
          }),
          transformOrigin: "right center",
        }}
        initial={false}
        animate={{
          rotateY: gatesOpen ? -22 : 0,
          skewY: gatesOpen ? -2 : 0,
          transformPerspective: 1100,
        }}
        transition={{ duration: GATE_OPEN_DURATION, ease: [0.33, 0, 0.2, 1] }}
        aria-hidden
      >
        <Image
          src="/intro/gate-right.png"
          alt=""
          fill
          sizes="100vw"
          className="intro-prop-img intro-prop-img--fill"
          priority
          aria-hidden
        />
      </motion.div>

      {/* stone columns — flank the gate; stretched tall so bases sink into rock */}
      <div
        className="intro-prop intro-prop--column"
        style={placeRect([30.7, 0, 62.8, 99.8], {
          left: 18.5,
          top: 31,
          width: 15,
          height: 49,
        })}
      >
        <Image
          src="/intro/left-column.png"
          alt=""
          fill
          sizes="100vw"
          className="intro-prop-img intro-prop-img--fill"
          priority
          aria-hidden
        />
      </div>
      <div
        className="intro-prop intro-prop--column"
        style={placeRect([21.9, 0, 64.4, 99.7], {
          left: 67,
          top: 31,
          width: 15,
          height: 49,
        })}
      >
        <Image
          src="/intro/right-column.png"
          alt=""
          fill
          sizes="100vw"
          className="intro-prop-img intro-prop-img--fill"
          priority
          aria-hidden
        />
      </div>

      {/* braziers on top of the columns */}
      <Prop
        src="/intro/left-flame.png"
        nat={[1254, 1254]}
        bbox={[25.5, 1.3, 78.1, 92.2]}
        target={{ left: 23, top: 8, width: 8 }}
        className="intro-prop--flame"
      />
      <Prop
        src="/intro/right-flame.png"
        nat={[1401, 1123]}
        bbox={[32.8, 3.2, 74.8, 90.1]}
        target={{ left: 69.3, top: 8.5, width: 8 }}
        className="intro-prop--flame"
      />
      </div>

      {/* foreground */}
      <Prop
        src="/intro/tombstone.png"
        nat={[1536, 1024]}
        bbox={[36.1, 3.2, 63.5, 96.4]}
        target={{ left: 87, top: 55, width: 9 }}
        className="intro-prop--tombstone"
      />
      <Prop
        src="/intro/ground.png"
        nat={[1536, 1024]}
        bbox={[0, 47.2, 99.8, 91.4]}
        target={{ left: 8, top: 78, width: 84 }}
        className="intro-prop--ground"
      />
      <Prop
        src="/intro/rocks.png"
        nat={[1536, 1024]}
        bbox={[0, 42.2, 99.8, 99.9]}
        target={{ left: 0, top: 44, width: 100 }}
        className="intro-prop--rocks"
      />

      {/* atmosphere */}
      <Prop
        src="/intro/fog.png"
        nat={[1672, 940]}
        bbox={[1.4, 9.9, 99.4, 86.2]}
        target={{ left: -5, top: 50, width: 110 }}
        className="intro-prop--fog intro-blend-screen"
      />
      <Prop
        src="/intro/particles.png"
        nat={[1672, 941]}
        bbox={[31.4, 23, 94, 74]}
        target={{ left: 50, top: 28, width: 25 }}
        className="intro-prop--particles intro-blend-screen"
      />
    </div>
  );
}
