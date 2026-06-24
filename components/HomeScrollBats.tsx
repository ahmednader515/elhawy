"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { BatShape } from "@/components/BatShape";

const MAX_BATS = 8;
const SCROLL_THRESHOLD = 380;
const SPAWN_COOLDOWN_MS = 650;

export function HomeScrollBats() {
  const layerRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);
  const lastScrollY = useRef(0);
  const lastSpawn = useRef(0);
  const accum = useRef(0);
  const activeRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const cap = isMobile ? 4 : MAX_BATS;

    const template = document.createElement("div");
    const templateRoot = createRoot(template);
    templateRoot.render(<BatShape className="home-bat-svg" />);
    let batMarkup = "";

    lastScrollY.current = window.scrollY;

    const spawnBat = () => {
      if (!activeRef.current) return;

      const layer = layerRef.current;
      if (!layer || countRef.current >= cap) return;
      if (!batMarkup) {
        batMarkup = template.innerHTML;
        if (!batMarkup) return;
      }

      const size = 34 + Math.random() * 40;
      const top = 5 + Math.random() * 70;
      const duration = 3.2 + Math.random() * 2;
      const drift = (Math.random() - 0.5) * 14;
      const flap = 0.16 + Math.random() * 0.1;

      const host = document.createElement("div");
      host.className = "home-bat";
      host.style.top = `${top}%`;
      host.style.width = `${size}px`;
      host.style.height = `${size * 0.45}px`;
      host.style.setProperty("--flap", `${flap}s`);
      host.innerHTML = batMarkup;

      layer.appendChild(host);
      countRef.current += 1;

      const animation = host.animate(
        [
          { transform: "translate3d(110vw, 0, 0) rotate(-90deg)" },
          { transform: `translate3d(-25vw, ${drift}px, 0) rotate(-90deg)` },
        ],
        { duration: duration * 1000, easing: "linear", fill: "forwards" },
      );

      animation.onfinish = () => {
        host.remove();
        countRef.current -= 1;
      };
    };

    const onScroll = () => {
      if (!activeRef.current) return;

      const y = window.scrollY;
      const dy = Math.abs(y - lastScrollY.current);
      accum.current += dy;
      lastScrollY.current = y;

      const now = Date.now();
      if (
        accum.current >= SCROLL_THRESHOLD &&
        now - lastSpawn.current >= SPAWN_COOLDOWN_MS
      ) {
        accum.current = 0;
        lastSpawn.current = now;
        spawnBat();
      }
    };

    const onVisibility = () => {
      activeRef.current = document.visibilityState === "visible";
      if (!activeRef.current && layerRef.current) {
        layerRef.current.replaceChildren();
        countRef.current = 0;
      }
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.setTimeout(() => templateRoot.unmount(), 0);
    };
  }, []);

  return <div ref={layerRef} className="home-bats" aria-hidden />;
}
