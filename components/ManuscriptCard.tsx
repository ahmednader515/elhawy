"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type ManuscriptCardProps = {
  children: ReactNode;
  /** Stagger index so cards in a row unroll one after another. */
  index?: number;
};

/**
 * A parchment-scroll card that starts rolled shut (only the rods show) and
 * unrolls vertically when it scrolls into view, revealing the content inside.
 */
export function ManuscriptCard({ children, index = 0 }: ManuscriptCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setOpen(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setOpen(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <article
      ref={ref}
      className={`manuscript${open ? " is-open" : ""}`}
      style={{ "--delay": `${index * 0.12}s` } as CSSProperties}
    >
      <span className="manuscript-rod manuscript-rod--top" aria-hidden />
      <div className="manuscript-paper">
        <div className="manuscript-paper-inner">
          <div className="manuscript-content">{children}</div>
        </div>
      </div>
      <span className="manuscript-rod manuscript-rod--bottom" aria-hidden />
    </article>
  );
}
