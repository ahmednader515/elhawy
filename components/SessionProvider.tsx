"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";

/** إعادة التحقق من الجلسة دورياً لاكتشاف تسجيل الدخول من جهاز آخر (بدون إغراق Neon) */
const SESSION_REFETCH_INTERVAL = 60;

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
