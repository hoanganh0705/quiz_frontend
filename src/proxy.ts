/**
 * Proxy for quiz_frontend (Next.js 16, Edge runtime).
 *
 * # Auth model (presence-only, not validated)
 *
 * This middleware checks the **presence** of the access-token cookie to decide
 * whether a request gets redirected to `/login?redirect=<original>`. It does
 * **not** cryptographically verify the JWT (Next.js middleware cannot run
 * `jsonwebtoken` safely in the Edge runtime), and it does not check the JWT's
 * roles or permissions claims.
 *
 * The authoritative validator is the backend's `JwtGuard`
 * (`quiz_backend/src/modules/auth/transport/guard/jwt.guard.ts`) plus the
 * per-route `@Permissions(...)` decorators. A request that fools this
 * middleware with a forged cookie will be rejected by the first authenticated
 * API call to the backend (HTTP 401). See "TODO: server-side validation"
 * below for the future-state plan.
 *
 * # Protected-route inventory
 *
 * The list below must stay in sync with
 * `quiz_frontend/docs/middleware-protected-routes.md`. When a prefix is added
 * to `PROTECTED_PREFIXES` or `ADMIN_PREFIXES`, both files must be updated
 * in the same commit.
 *
 * > **Source-of-truth split.** This middleware is the source of truth for
 * > *which URL prefixes* are gated. The folder
 * > `quiz_frontend/src/app/(protected)/**` is the source of truth for
 * > *where the protected route components live* in source. Every URL in
 * > `PROTECTED_PREFIXES` / `ADMIN_PREFIXES` should be backed by a folder
 * > under `app/(protected)/` (the admin/social/instances/notifications/
 * > tournaments folders were migrated into the protected route group as
 * > part of the route-group-consistency refactor).
 *
 *   - `/admin`        — admin console (`app/(protected)/admin/**`,
 *                       admin role enforced server-side only)
 *   - `/bookmarks`    — bookmarked quizzes (`app/(protected)/bookmarks/**`,
 *                       backend: `bookmark` module)
 *   - `/create-quiz`  — quiz authoring (`app/(protected)/create-quiz/**`,
 *                       backend: `quiz` module)
 *   - `/friends`      — social graph (`app/(protected)/friends/**`,
 *                       backend: `social` module)
 *   - `/instances`    — live quiz sessions
 *                       (`app/(protected)/instances/**`, backend:
 *                       `instance` module)
 *   - `/my-profile`   — current user's own profile
 *                       (`app/(protected)/my-profile/**`,
 *                       backend: `user` module)
 *   - `/notifications`— notification center + preferences
 *                       (`app/(protected)/notifications/**`,
 *                       backend: `notification` module)
 *   - `/onboarding`   — first-run UX (`app/(protected)/onboarding/**`,
 *                       frontend-only until submit)
 *   - `/quiz-history` — user's attempt history
 *                       (`app/(protected)/quiz-history/**`,
 *                       backend: `attempt` module)
 *   - `/settings`     — account-level preferences
 *                       (`app/(protected)/settings/**`,
 *                       backend: `user` module)
 *   - `/social`       — read-only social-graph lists
 *                       (`app/(protected)/social/**`, Story 6.2)
 *   - `/tournament`   — tournament landing (singular,
 *                       `app/(protected)/tournament/**`,
 *                       backend: `tournament` module)
 *   - `/tournaments`  — tournament listings + detail pages (plural,
 *                       `app/(protected)/tournaments/**`,
 *                       backend: `tournament` module;
 *                       `/tournament` is also caught by the prefix)
 *
 * # Excluded paths
 *
 * The matcher regex at the bottom of this file short-circuits Next.js static
 * assets and standard `robots.txt` / `sitemap.xml` requests. The
 * `PUBLIC_ROUTES` constant inside the function body is a defensive duplicate
 * of those exclusions, with extra entries for `/api`, `/manifest`, `/sw` —
 * see `docs/middleware-protected-routes.md → Excluded paths` for the full
 * table.
 *
 * // TODO: server-side validation — when Next.js 16 server-side validation
 *   lands (per `quiz_frontend/package.json`), upgrade this middleware to:
 *     1) verify the JWT signature against a public key (JWKS),
 *     2) reject with 401 *before* issuing the redirect, and
 *     3) consult the `roles` claim for `/admin/*` so the middleware becomes
 *        admin-aware instead of relying solely on the backend `@Permissions`.
 *   Tracked as a Phase-2 ticket.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthTokenFromRequest } from "@/features/auth/utils/auth-cookies";

// Routes that require an authenticated user
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
  // Story 6.2 / TKT-6.2.B1+B2 — `/social/*` requires an authenticated
  // viewer because every list page is either viewer-only
  // (`/social/blocked`) or surfaces viewer-specific relationships
  // (counts, follow status, pending requests). The `social_live`
  // and `social_relationship_live` feature flags gate the live
  // rendering; the middleware enforces the *authentication* contract.
  "/social",
  "/tournament",
] as const;

// Routes that should redirect authenticated users away (auth pages)
const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/resend-verification",
  "/verify-email",
] as const;

// Admin routes — require admin role (checked server-side; here we guard by auth only)
const ADMIN_PREFIXES = ["/admin"] as const;

// Routes that never redirect
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

  // Skip static files, Next.js internals, and API routes
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = getAuthTokenFromRequest(request);
  const isAuthenticated = !!token;

  // ── Guard: protected routes ──────────────────────────────────────────────────
  if (isProtected(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the intended destination so we can redirect back after login
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Guard: already authenticated → redirect away from auth pages ─────────────
  if (isAuthRoute(pathname) && isAuthenticated) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (redirectParam) {
      const dest = new URL(redirectParam, request.url);
      if (dest.pathname !== pathname) {
        return NextResponse.redirect(dest);
      }
    }
    // Default redirect for authenticated users on auth pages
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, etc.
     * - Files with extensions (e.g. .png, .svg)
     */
    "/((?!_next/static|_next/image|favicon|robots|sitemap|.*\\..*$).*)",
  ],
};
