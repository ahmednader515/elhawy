"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";

/** refetchInterval: إعادة التحقق من الجلسة كل ٥ ثوانٍ حتى يُسجّل خروج الجهاز الآخر فوراً دون حاجة لريفرش */
const SESSION_REFETCH_INTERVAL = 5;

function SessionRefetchWhenVisible() {
  const { update } = useSession();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        void update();
      }
    };

    const id = window.setInterval(tick, SESSION_REFETCH_INTERVAL * 1000);
    return () => window.clearInterval(id);
  }, [update]);

  return null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <NextAuthSessionProvider refetchOnWindowFocus>
      {mounted ? <SessionRefetchWhenVisible /> : null}
      {children}
    </NextAuthSessionProvider>
  );
}
