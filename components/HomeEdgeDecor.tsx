/** Cobweb art tucked into the top page corners as a gothic frame. */
export function HomeEdgeDecor() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="home-edge home-edge--left" src="/intro/web-left.png" alt="" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="home-edge home-edge--right" src="/intro/web-right.png" alt="" aria-hidden />
    </>
  );
}
