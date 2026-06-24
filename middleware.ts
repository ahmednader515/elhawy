import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { INTRO_COOKIE_NAME } from "@/lib/introImages";

export default withAuth(
  function middleware(req) {
    const path = req.nextUrl.pathname;

    // First-time visitors enter via /intro; after completion a short-lived cookie
    // lets router.replace("/") reach the homepage without a redirect loop.
    if (path === "/" && req.cookies.get(INTRO_COOKIE_NAME)?.value !== "1") {
      return NextResponse.redirect(new URL("/intro", req.url));
    }

    if (!path.startsWith("/dashboard")) {
      return NextResponse.next();
    }

    const role = req.nextauth.token?.role as string;

    if (path.startsWith("/dashboard/teachers")) {
      if (role === "ADMIN") return NextResponse.next();
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard/subscription-students")) {
      if (role === "ADMIN") return NextResponse.next();
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard/students") || path.startsWith("/dashboard/courses/new")) {
      if (path.startsWith("/dashboard/students")) {
        if (role === "ADMIN" || role === "ASSISTANT_ADMIN") {
          return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      if (role === "ADMIN" || role === "ASSISTANT_ADMIN" || role === "TEACHER") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const teacherBlocked =
      role === "TEACHER" &&
      (path.startsWith("/dashboard/settings/homepage") ||
        path.startsWith("/dashboard/reviews") ||
        path.startsWith("/dashboard/password-change-requests"));
    if (teacherBlocked) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (!req.nextUrl.pathname.startsWith("/dashboard")) return true;
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
