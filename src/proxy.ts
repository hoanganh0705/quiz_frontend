import { NextRequest, NextResponse } from "next/server";

import { hasUsableSession } from "@/features/auth/utils/auth-cookies";

import {
  LOGIN_ROUTE,
  isAuthRoute,
  isProtectedRoute,
  isPublicAssetRoute,
  resolveSafeInternalRedirect,
} from "@/shared/config/routes";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicAssetRoute(pathname)) {
    return NextResponse.next();
  }

  const isAuthenticated = hasUsableSession(request);
  const fullPath = `${pathname}${search}`;

  if (isProtectedRoute(pathname) && !isAuthenticated) {
    const loginUrl = new URL(LOGIN_ROUTE, request.url);
    loginUrl.searchParams.set("redirect", fullPath);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute(pathname) && isAuthenticated) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const safeDest = resolveSafeInternalRedirect(redirectParam, request.url);
    if (safeDest && safeDest.pathname !== pathname) {
      return NextResponse.redirect(safeDest);
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", fullPath);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|robots|sitemap|.*\\..*$).*)",
  ],
};
