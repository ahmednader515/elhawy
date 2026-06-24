"use client";

import dynamic from "next/dynamic";

const HomeScrollBats = dynamic(
  () => import("@/components/HomeScrollBats").then((m) => m.HomeScrollBats),
  { ssr: false },
);

export function HomeScrollBatsLazy() {
  return <HomeScrollBats />;
}
