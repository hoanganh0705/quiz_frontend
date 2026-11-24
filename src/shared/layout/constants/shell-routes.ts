export const SHELL_PREFIXES = [
  "/achievements",
  "/bookmarks",
  "/categories",
  "/coins",
  "/create-quiz",
  "/daily-challenge",
  "/friends",
  "/instances",
  "/leaderboard",
  "/my-profile",
  "/my-quizzes",
  "/notifications",
  "/onboarding",
  "/profile",
  "/quiz-history",
  "/quizzes",
  "/rankings",
  "/search",
  "/settings",
  "/social",
  "/support",
  "/tags",
  "/tournament",
  "/tournaments",
  "/users",
] as const;

export const SHELL_EXACT_PATHS = ["/"] as const;

export const AUTH_PAGES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/resend-verification",
  "/verify-email",
] as const;

export function isShellPage(pathname: string | undefined): boolean {
  if (!pathname) return true;
  if (SHELL_EXACT_PATHS.some((p) => pathname === p)) return true;
  return SHELL_PREFIXES.some((p) => pathname.startsWith(p));
}

export function isAuthPage(pathname: string | undefined): boolean {
  if (!pathname) return false;
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p));
}
