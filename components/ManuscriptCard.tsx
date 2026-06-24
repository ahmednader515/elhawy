import type { ReactNode } from "react";

type ManuscriptCardProps = {
  children: ReactNode;
};

/**
 * A parchment-scroll card that displays fully unrolled (no scroll animation).
 */
export function ManuscriptCard({ children }: ManuscriptCardProps) {
  return (
    <article className="manuscript is-open">
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
