"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";

/** refetchInterval: إعادة التحقق من الجلسة كل ٥ ثوانٍ حتى يُسجّل خروج الجهاز الآخر فوراً دون حاجة لريفرش */
const SESSION_REFETCH_INTERVAL = 5;

function SessionRefetchWhenVisible() {
  const { data: session, update } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    const tick = () => {
      if (document.visibilityState === "visible") {
        void update();
      }
    };

    const id = window.setInterval(tick, SESSION_REFETCH_INTERVAL * 1000);
    return () => window.clearInterval(id);
  }, [session?.user, update]);

  return null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <NextAuthSessionProvider refetchOnWindowFocus={false}>
      {mounted ? <SessionRefetchWhenVisible /> : null}
      {children}
    </NextAuthSessionProvider>
  );
}
