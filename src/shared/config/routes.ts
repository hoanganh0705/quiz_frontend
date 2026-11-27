export const LOGIN_ROUTE = "/login" as const;

export const LEGAL_ROUTES = {
  terms: "/terms",
  privacy: "/privacy",
} as const;

export const PUBLIC_SHELL_PREFIXES = [
  "/achievements",
  "/categories",
  "/daily-challenge",
  "/leaderboard",
  "/privacy",
  "/profile",
  "/quizzes",
  "/rankings",
  "/search",
  "/support",
  "/tags",
  "/terms",
  "/users",
] as const;

export const PROTECTED_SHELL_PREFIXES = [
  "/bookmarks",
  "/coins",
  "/create-quiz",
  "/friends",
  "/instances",
  "/my-profile",
  "/my-quizzes",
  "/notifications",
  "/onboarding",
  "/quiz-history",
  "/settings",
  "/social",
  "/tournament",
  "/tournaments",
] as const;

export const ADMIN_ROUTE_PREFIXES = ["/admin"] as const;

export const PROTECTED_ROUTE_PATTERNS: readonly RegExp[] = [
  /^\/quizzes\/[^/]+\/attempt(?:\/|$)/,
];

export const SHELL_EXACT_PATHS = ["/"] as const;

export const SHELL_PREFIXES = [
  ...PUBLIC_SHELL_PREFIXES,
  ...PROTECTED_SHELL_PREFIXES,
] as const;

export const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/resend-verification",
  "/verify-email",
] as const;

export const PUBLIC_ASSET_PREFIXES = [
  "/api",
  "/_next",
  "/favicon",
  "/manifest",
  "/sw",
] as const;

/**
 * Indexable public routes included in `sitemap.xml`.
 * Protected routes, auth routes, and legacy redirect aliases MUST NOT appear here.
 */
export const PUBLIC_SITEMAP_ROUTES = [
  "/",
  "/quizzes",
  "/categories",
  "/tags",
  "/daily-challenge",
  "/leaderboard",
  "/rankings",
  "/achievements",
  "/support",
  "/terms",
  "/privacy",
] as const;

const MAX_REDIRECT_PATH_LENGTH = 2048;

export function matchesSegmentPrefix(
  pathname: string,
  prefix: string,
): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAdminRoute(pathname: string | undefined): boolean {
  if (!pathname) return false;
  return ADMIN_ROUTE_PREFIXES.some((prefix) =>
    matchesSegmentPrefix(pathname, prefix),
  );
}

export function isProtectedRoute(pathname: string | undefined): boolean {
  if (!pathname) return false;
  if (
    PROTECTED_SHELL_PREFIXES.some((prefix) =>
      matchesSegmentPrefix(pathname, prefix),
    ) ||
    isAdminRoute(pathname)
  ) {
    return true;
  }
  return PROTECTED_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function isAuthRoute(pathname: string | undefined): boolean {
  if (!pathname) return false;
  return AUTH_ROUTES.some((route) => matchesSegmentPrefix(pathname, route));
}

export function isShellRoute(pathname: string | undefined): boolean {
  if (!pathname) return true;
  if (SHELL_EXACT_PATHS.some((path) => pathname === path)) return true;
  return SHELL_PREFIXES.some((prefix) =>
    matchesSegmentPrefix(pathname, prefix),
  );
}

export function isPublicAssetRoute(pathname: string): boolean {
  return PUBLIC_ASSET_PREFIXES.some((prefix) =>
    matchesSegmentPrefix(pathname, prefix),
  );
}

/**
 * Authoritative redirect-target predicate.
 * Blocks protocol-relative (`//`), backslash authority (`/\`), external schemes,
 * control characters, overly long strings, and auth-flow loops (`AUTH_ROUTES`).
 */
export function isSafeRedirectTarget(target: unknown): target is string {
  if (typeof target !== "string") return false;
  if (target.length === 0 || target.length > MAX_REDIRECT_PATH_LENGTH) {
    return false;
  }
  if (!target.startsWith("/") || target.startsWith("//")) return false;
  if (target.includes("\\")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) return false;
  if (/[\x00-\x1f\x7f]/.test(target)) return false;

  try {
    const base = new URL("https://quizhub.internal");
    const dest = new URL(target, base.origin);
    if (dest.origin !== base.origin) return false;
    if (isAuthRoute(dest.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Client-safe redirect resolver using `isSafeRedirectTarget`.
 */
export function resolveSafeRedirectPath(
  rawRedirect: string | null | undefined,
  fallback = "/",
): string {
  if (isSafeRedirectTarget(rawRedirect)) {
    return rawRedirect;
  }
  return fallback;
}

/**
 * Validates that a `?redirect=` target is strictly an internal same-origin path.
 * Blocks protocol-relative (`//evil.com`), backslash (`/\evil.com`),
 * absolute external (`https://evil.com`), auth loops, and malformed URLs.
 */
export function resolveSafeInternalRedirect(
  rawRedirect: string | null,
  requestUrl: string,
): URL | null {
  if (!rawRedirect) return null;
  const trimmed = rawRedirect.trim();
  if (!isSafeRedirectTarget(trimmed)) {
    return null;
  }
  try {
    const base = new URL(requestUrl);
    const dest = new URL(trimmed, base.origin);
    if (dest.origin !== base.origin) {
      return null;
    }
    if (isAuthRoute(dest.pathname)) {
      return null;
    }
    return dest;
  } catch {
    return null;
  }
}
