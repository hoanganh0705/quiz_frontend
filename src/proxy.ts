

import { NextRequest, NextResponse } from "next/server";
import { getAuthTokenFromRequest } from "@/features/auth/utils/auth-cookies";

const PROTECTED_PREFIXES = [
"/bookmarks",
"/create-quiz",
"/friends",
"/instances",
"/my-profile",
"/notifications",
"/onboarding",
"/quiz-history",
"/settings",

"/social",
"/tournament",
] as const;

const AUTH_ROUTES = [
"/login",
"/signup",
"/forgot-password",
"/resend-verification",
"/verify-email",
] as const;

const ADMIN_PREFIXES = ["/admin"] as const;

const PUBLIC_ROUTES = [
"/api",
"/_next",
"/favicon",
"/manifest",
"/sw",
] as const;

function isProtected(pathname: string): boolean {
return [...PROTECTED_PREFIXES, ...ADMIN_PREFIXES].some((p) =>
pathname.startsWith(p),
  );
}

function isAuthRoute(pathname: string): boolean {
return AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r));
}

function isPublic(pathname: string): boolean {
return PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
}

export function proxy(request: NextRequest) {
const { pathname } = request.nextUrl;

if (isPublic(pathname)) {
return NextResponse.next();
  }

const token = getAuthTokenFromRequest(request);
const isAuthenticated = !!token;

if (isProtected(pathname) && !isAuthenticated) {
const loginUrl = new URL("/login", request.url);

loginUrl.searchParams.set("redirect", pathname);
return NextResponse.redirect(loginUrl);
  }

if (isAuthRoute(pathname) && isAuthenticated) {
const redirectParam = request.nextUrl.searchParams.get("redirect");
if (redirectParam) {
const dest = new URL(redirectParam, request.url);
if (dest.pathname !== pathname) {
return NextResponse.redirect(dest);
      }
    }

return NextResponse.redirect(new URL("/", request.url));
  }

return NextResponse.next();
}

export const config = {
matcher: [

"/((?!_next/static|_next/image|favicon|robots|sitemap|.*\\..*$).*)",
  ],
};
