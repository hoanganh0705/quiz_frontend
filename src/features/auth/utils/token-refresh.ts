/**
 * Token refresh utility — explicit refresh for bootstrap scenarios.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.9.
 *
 * ## Purpose
 *
 * Provides an explicit refresh mechanism for the bootstrap flow. While the
 * `custom-instance.ts` interceptor handles automatic 401 refresh for regular
 * API calls, this utility provides:
 *
 * 1. A dedicated refresh function for bootstrap scenarios
 * 2. Deduplication via the module-level `inFlightRefresh` in custom-instance
 * 3. Return URL storage for post-login redirect
 *
 * ## Usage
 *
 * ```typescript
 * // Before bootstrap requests
 * await refreshAccessToken();
 *
 * // Now safe to call /auth/me and /users/me
 * ```
 *
 * ## Integration
 *
 * The `AuthBootstrapContext` calls this before making bootstrap requests to
 * ensure we have a valid token. The existing interceptor in `custom-instance.ts`
 * handles automatic refresh for any 401 during normal API calls.
 */

import { singleflight } from "@/features/auth/utils/bootstrap-deduplicator";

// Re-export the refresh function from custom-instance for explicit use
// The custom-instance already has in-flight deduplication via inFlightRefresh
export { doRefresh as refreshAccessToken } from "@/lib/api/core/custom-instance";

/**
 * Refresh token and return URL for bootstrap.
 *
 * This is a convenience wrapper that:
 * 1. Calls the refresh endpoint
 * 2. Stores the current path as return URL
 * 3. Returns the result of the refresh
 *
 * @param returnUrl - The URL to redirect to after login (default: current path)
 */
export async function refreshAndStoreReturnUrl(
  returnUrl: string = typeof window !== "undefined"
    ? window.location.pathname
    : "/",
): Promise<void> {
  // Store return URL in sessionStorage for post-login redirect
  if (typeof window !== "undefined") {
    sessionStorage.setItem("auth_return_url", returnUrl);
  }

  // Trigger refresh (will use existing in-flight mechanism if already refreshing)
  await refreshAccessToken();
}

/**
 * Get the stored return URL and clear it.
 * Used by the login page to redirect after successful login.
 */
export function getAndClearReturnUrl(): string {
  if (typeof window === "undefined") return "/quizzes";

  const url = sessionStorage.getItem("auth_return_url") ?? "/quizzes";
  sessionStorage.removeItem("auth_return_url");
  return url;
}

/**
 * Check if there's a stored return URL.
 */
export function hasReturnUrl(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("auth_return_url") !== null;
}

/**
 * Shared refresh with deduplication for bootstrap.
 * Uses singleflight to ensure only one refresh runs even with concurrent consumers.
 */
export async function sharedBootstrapRefresh(): Promise<void> {
  await singleflight("bootstrap-refresh", async () => {
    await refreshAccessToken();
  });
}
