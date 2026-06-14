"use client";

import { useEffect, useRef } from "react";
import "./magic-cursor.css";

const GLITTER_COLORS = [
  "#e9d5ff",
  "#c084fc",
  "#a855f7",
  "#fbbf24",
  "#fde68a",
  "#f9a8d4",
];

const SPAWN_DISTANCE = 6;
const MAX_GLITTER = 90;
// Star tip offset within the 44x44 wand SVG (the cursor "hotspot").
const TIP_X = 11;
const TIP_Y = 10;

export function MagicCursor() {
  const wandRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const last = useRef({ x: -100, y: -100 });
  const rafRef = useRef(0);
  const visibleRef = useRef(false);
  const countRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const root = document.documentElement;
    root.classList.add("magic-cursor-active");

    const spawnGlitter = (x: number, y: number, burst = false) => {
      const layer = layerRef.current;
      if (!layer || countRef.current >= MAX_GLITTER) return;

      const size = 4 + Math.random() * 7;
      const tx = (Math.random() - 0.5) * (burst ? 90 : 28);
      const ty = (burst ? 10 : 18) + Math.random() * (burst ? 80 : 60);
      const dur = 600 + Math.random() * 750;
      const color = GLITTER_COLORS[(Math.random() * GLITTER_COLORS.length) | 0];

      const el = document.createElement("span");
      el.className = "magic-glitter";
      el.style.left = `${x + (Math.random() - 0.5) * 10}px`;
      el.style.top = `${y + (Math.random() - 0.5) * 10 + 4}px`;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.background = color;
      el.style.boxShadow = `0 0 ${size}px ${color}, 0 0 ${size * 2}px ${color}`;
      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--dur", `${dur}ms`);

      countRef.current += 1;
      el.addEventListener("animationend", () => {
        el.remove();
        countRef.current -= 1;
      });
      layer.appendChild(el);
    };

    const onMove = (e: PointerEvent) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;

      if (!visibleRef.current) {
        visibleRef.current = true;
        if (wandRef.current) wandRef.current.style.opacity = "1";
      }

      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      if (Math.hypot(dx, dy) >= SPAWN_DISTANCE) {
        spawnGlitter(e.clientX, e.clientY);
        last.current.x = e.clientX;
        last.current.y = e.clientY;
      }
    };

    const onDown = () => {
      for (let i = 0; i < 10; i += 1) {
        spawnGlitter(pos.current.x, pos.current.y, true);
      }
    };

    const hide = () => {
      visibleRef.current = false;
      if (wandRef.current) wandRef.current.style.opacity = "0";
    };

    const tick = () => {
      if (wandRef.current) {
        wandRef.current.style.transform = `translate3d(${
          pos.current.x - TIP_X
        }px, ${pos.current.y - TIP_Y}px, 0)`;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);

    return () => {
      window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
      root.classList.remove("magic-cursor-active");
    };
  }, []);

  return (
    <div className="magic-cursor-root" aria-hidden>
      <div ref={layerRef} className="magic-glitter-layer" />
      <div ref={wandRef} className="magic-wand" style={{ opacity: 0 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <defs>
            <linearGradient id="magicWandStick" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d9b876" />
              <stop offset="0.25" stopColor="#5b4326" />
              <stop offset="1" stopColor="#241a10" />
            </linearGradient>
            <radialGradient id="magicWandStar" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#fffef2" />
              <stop offset="0.4" stopColor="#ffe9a8" />
              <stop offset="1" stopColor="#f59e0b" />
            </radialGradient>
          </defs>
          <line
            x1="15"
            y1="15"
            x2="36"
            y2="36"
            stroke="url(#magicWandStick)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1="14"
            y1="14"
            x2="19"
            y2="19"
            stroke="#e9c878"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            className="magic-wand-star"
            d="M11 1.5 L13.3 8 L20 8.4 L14.6 12.4 L16.5 19 L11 15.1 L5.5 19 L7.4 12.4 L2 8.4 L8.7 8 Z"
            fill="url(#magicWandStar)"
          />
        </svg>
      </div>
    </div>
  );
}
