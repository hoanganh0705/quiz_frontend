/**
 * `clear-auth-state.ts` — Single canonical local cleanup helper for
 * "the user is no longer authenticated" code paths.
 *
 * Source epic:   Phase 4 — Cross-tab sync infrastructure.
 * Source ticket: TKT-Phase-4 — P1-11.
 *
 * ## Why this file exists
 *
 * Before Phase 4, every auth-cleanup code path
 * (`logout()`/`logoutAll()` in `auth.service`, the 401-refresh
 * fallback in `custom-instance.ts`, the deletion finalization in
 * `lifecycle/deletion-*.ts`, the cookie-clear in `use-auth-state.ts`,
 * and the auth-bootstrap context revalidation hook) repeated the
 * same triple-clear pattern:
 *
 *   ```ts
 *   clearVerificationFlags();
 *   clearAuthToken();
 *   clearAllAuthCache();
 *   broadcastLogout();
 *   ```
 *
 * Each caller had a slightly different ordering — some forgot
 * `broadcastLogout()` (breaking cross-tab convergence), some forgot
 * `clearAllAuthCache()` (leaking identity cache entries), some
 * swallowed a redirect (orphaning the user on a protected page).
 * The result: 6 callsites × 4 lines × subtle differences = a
 * partial guarantee of "user reaches a public surface after Sign
 * Out".
 *
 * `clearAuthState({ redirectTo })` consolidates this discipline:
 *
 *   1. Drop in-memory "recently verified" flags (so a stale flag
 *      cannot survive a local logout).
 *   2. Drop the access-token cookie (the source of truth for
 *      `useAuthState`).
 *   3. Drop every `auth_cache_*` localStorage key.
 *   4. Broadcast a cross-tab `LOGGED_OUT` event so sibling tabs
 *      converge.
 *   5. Optionally redirect to `redirectTo` (validated via
 *      `safeRedirectTarget`).
 *
 * ## What this file does NOT own
 *
 *   - The `POST /auth/logout` (or `/auth/logout-all`) network call.
 *     The service's `logout()` runs `clearAuthState` inside its
 *     `finally` block; the helper is the canonical side-effect of
 *     "the user is no longer authenticated", not the network round
 *     trip itself.
 *   - SWR cache revalidation. The cross-tab `LOGGED_OUT` listener
 *     in `custom-instance.ts` already invalidates every `useUser*`
 *     key; this helper does not duplicate that work.
 *   - The cross-tab event listener. Existing listeners
 *     (`installAuthStateChangeListener`) keep working; this helper
 *     is the *publisher* side of the contract.
 *
 * ## When to use this
 *
 * Use this helper at every site that previously called the
 * triple-clear pattern. If your code path also issues a network
 * call (logout, logout-all, 401-revoke), run the network call in a
 * `try` and call `clearAuthState({ redirectTo })` in `finally` so
 * the cleanup happens regardless of the backend's response.
 *
 * @example
 *   ```ts
 *   // Standalone (no network call):
 *   clearAuthState({ redirectTo: '/login' });
 *
 *   // Around a network call:
 *   try {
 *     await api.post('/auth/logout');
 *   } finally {
 *     clearAuthState({ redirectTo: '/' });
 *   }
 *   ```
 */

import { clearAuthToken } from '@/features/auth/utils/auth-cookies';
import { clearAllAuthCache } from '@/features/auth/utils/user-scoped-cache';
import { clearVerificationFlags } from '@/features/auth/utils/verification-flag';
import { isSafeRedirectTarget } from '@/features/auth/utils/safe-redirect';
import { broadcastAuthEvent } from '@/lib/api/core/broadcast-channel';

/**
 * Options for `clearAuthState`.
 */
export interface ClearAuthStateOptions {
  /**
   * Optional path to redirect to after the cleanup completes.
   * The path is validated via `isSafeRedirectTarget`; an unsafe or
   * missing value is ignored (no redirect is performed). The
   * caller is responsible for issuing the actual `router.replace`
   * — this helper only signals the intent.
   *
   * Acceptable paths: `/`, `/login`, `/quizzes`, etc.
   * Rejected: `//evil.com`, `https://evil.com`, `/login` (avoids
   * bounce), null bytes, empty string.
   */
  redirectTo?: string | null;
  /**
   * When `true`, skip the cross-tab `LOGGED_OUT` broadcast. Use
   * this only when the surrounding code path already broadcasts
   * (e.g. inside `auth.service.logout()` which broadcasts in its
   * own `finally`). Defaults to `false`.
   */
  skipBroadcast?: boolean;
}


/**
 * Run the canonical local auth-cleanup sequence:
 *
 *   1. `clearVerificationFlags()` — drop in-memory "recently
 *      verified" flags so a stale flag cannot survive a local
 *      logout.
 *   2. `clearAuthToken()` — drop the access-token cookie (the
 *      source of truth for `useAuthState`).
 *   3. `clearAllAuthCache()` — drop every `auth_cache_*` entry in
 *      localStorage.
 *   4. `broadcastLogout()` — broadcast a cross-tab `LOGGED_OUT`
 *      event so sibling tabs converge (unless `skipBroadcast`).
 *   5. Optional redirect — when `redirectTo` is provided AND safe,
 *      call `window.location.assign(redirectTo)` so the user lands
 *      on a public surface. The redirect uses `location.assign`
 *      rather than `router.replace` to remain framework-agnostic
 *      (the helper is called from contexts that don't always have
 *      a `useRouter` instance — the cookie refresh interceptor,
 *      the deletion finalization, etc.).
 *
 * The function never throws. Every step is individually
 * `try / catch`-wrapped so a failure in one step does not
 * short-circuit the rest.
 *
 * @param options Optional redirect / broadcast override.
 *
 * @example
 *   clearAuthState({ redirectTo: '/' });
 */
export function clearAuthState(options: ClearAuthStateOptions = {}): void {
  const { redirectTo = null, skipBroadcast = false } = options;

  // Step 1: drop in-memory "recently verified" flags.
  try {
    clearVerificationFlags();
  } catch {
    // Storage / globals may be unavailable in some test setups;
    // the rest of the cleanup still runs.
  }

  // Step 2: drop the access-token cookie.
  try {
    clearAuthToken();
  } catch {
    // Same — fail-open so a cookie write error does not block the
    // broadcast / redirect.
  }

  // Step 3: drop every `auth_cache_*` entry in localStorage.
  try {
    clearAllAuthCache();
  } catch {
    // Same — fail-open.
  }

  // Step 4: broadcast a cross-tab `LOGGED_OUT` event so sibling
  // tabs redirect to `/login` in lockstep. The broadcast is fire-
  // and-forget; the helper does not await it.
  if (!skipBroadcast) {
    try {
      broadcastAuthEvent({ type: 'LOGGED_OUT' });
    } catch {
      // The broadcast channel may be unavailable in SSR / private
      // browsing; the local cleanup above is sufficient.
    }
  }

  // Step 5: optional redirect. The redirect is gated by
  // `isSafeRedirectTarget` so an attacker-controlled
  // `?redirect=//evil.com` cannot reach `location.assign`.
  if (
    typeof redirectTo === 'string' &&
    isSafeRedirectTarget(redirectTo) &&
    typeof globalThis !== 'undefined' &&
    globalThis.location !== undefined &&
    typeof globalThis.location.assign === 'function'
  ) {
    globalThis.location.assign(redirectTo);
  }
}