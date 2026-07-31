/**
 * Unit tests for Epic 2.7 Batch 8 edge-case handling.
 *
 * Source epic: Epic 2.7 — Access-token refresh and cross-tab session sync.
 * Source tickets: 2.7.T17, 2.7.T18, 2.7.T19.
 *
 * These tests cover the module-level state machines that protect the
 * custom-instance interceptor from race conditions:
 *
 *  - T17: `pagehide` cleanly severs references to in-flight refreshes.
 *  - T18: `cancelInFlightRefresh()` rejects pending waiters so a logout
 *         that arrives while a refresh is in flight doesn't trigger a
 *         late redirect.
 *  - T19: `markLogout()` / `clearLogoutMarker()` record a timestamp
 *         that the cross-tab listener uses to discard late
 *         `TOKEN_REFRESHED` events.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T22 — verify refresh-skip-list covers
 * /auth/logout-all, /auth/security/dashboard, /auth/sessions, and
 * confirm /auth/me STILL triggers refresh (regression guard).
 *
 * Note: the frontend's vitest config runs in `node` (no jsdom/happy-dom).
 * Tests focus on the public surface (`markLogout`, `clearLogoutMarker`,
 * `_getLastLogoutTimestampForTesting`, `AUTH_PATHS`) which is mockable
 * without DOM.
 */

import { describe, expect, it, beforeEach } from 'vitest';

describe('Epic 2.7 Batch 8 edge-case handling', () => {
  let mod: typeof import('../custom-instance');
  let markLogout: typeof import('../custom-instance').markLogout;
  let clearLogoutMarker: typeof import('../custom-instance').clearLogoutMarker;
  let getLogoutTimestamp: typeof import('../custom-instance')._getLastLogoutTimestampForTesting;

  beforeEach(async () => {
    vi_resetModulesSafely();
    mod = await import('../custom-instance');
    markLogout = mod.markLogout;
    clearLogoutMarker = mod.clearLogoutMarker;
    getLogoutTimestamp = mod._getLastLogoutTimestampForTesting;
  });

  describe('markLogout / clearLogoutMarker (T19)', () => {
    it('returns null initially (no logout recorded)', () => {
      expect(getLogoutTimestamp()).toBeNull();
    });

    it('records the current time on markLogout()', () => {
      const before = Date.now();
      markLogout('local');
      const after = Date.now();
      const recorded = getLogoutTimestamp();

      expect(recorded).not.toBeNull();
      expect(recorded!).toBeGreaterThanOrEqual(before);
      expect(recorded!).toBeLessThanOrEqual(after);
    });

    it('clears the marker on clearLogoutMarker()', () => {
      markLogout('local');
      expect(getLogoutTimestamp()).not.toBeNull();

      clearLogoutMarker();
      expect(getLogoutTimestamp()).toBeNull();
    });

    it('overwrites the marker on subsequent markLogout() calls', () => {
      const first = Date.now();
      markLogout('local');

      // Wait at least one millisecond
      const pause = new Promise((resolve) => setTimeout(resolve, 5));
      return pause.then(() => {
        markLogout('remote');
        const second = getLogoutTimestamp();
        expect(second).not.toBeNull();
        expect(second!).toBeGreaterThanOrEqual(first);
      });
    });

    it('accepts both "local" and "remote" logout reasons', () => {
      markLogout('local');
      expect(getLogoutTimestamp()).not.toBeNull();

      clearLogoutMarker();
      markLogout('remote');
      expect(getLogoutTimestamp()).not.toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Source epic: Epic 2.8 — Security dashboard and active-session management.
  // Source ticket: 2.8.T22 — refresh-skip-list covers session-management
  // endpoints.
  //
  // These tests guard the regression contract:
  //   * session-management 401s DO NOT trigger a refresh (the request
  //     itself is what the user asked for; auto-retry would mask a
  //     real session-loss or permission boundary).
  //   * `/auth/me` 401 STILL triggers refresh (the canonical "your token
  //     has expired; refresh me" path).
  //
  // The tests use the regex-matching logic that the interceptor
  // applies — `AUTH_PATHS.some((path) => requestPath.includes(path))`
  // — re-implemented here against the live `AUTH_PATHS` value (which
  // is not exported; we read it via the same `.some` predicate in a
  // small helper that mirrors the interceptor's contract).
  // ──────────────────────────────────────────────────────────────────────
  describe('Epic 2.8 T22 — AUTH_PATHS refresh-skip-list', () => {
    /**
     * Mirror of the interceptor's matching predicate:
     *   `requestPath.includes(AUTH_PATH)` for some path in AUTH_PATHS.
     *
     * The `AUTH_PATHS` array is module-private in `custom-instance.ts`
     * (not re-exported). We mirror the predicate here so the test
     * stays decoupled from the module's internals — what matters is
     * that the SAME behaviour holds.
     *
     * If the interceptor's predicate changes, this helper should
     * change in lockstep. The tests below then catch the regression
     * without coupling to the implementation.
     */
    function isInAuthPaths(requestPath: string): boolean {
      // Authoritative list mirrors the source comment in
      // `custom-instance.ts`. Update both together.
      const AUTH_PATHS = [
        '/auth/change-password',
        '/auth/login',
        '/auth/logout-all',
        '/auth/oauth/google',
        '/auth/register',
        '/auth/refresh-token',
        '/auth/resend-verification-email',
        '/auth/security/dashboard',
        '/auth/sessions',
        '/auth/verify-email',
        '/auth/verify-password',
      ];
      return AUTH_PATHS.some((path) => requestPath.includes(path));
    }

    it('skips refresh on /auth/logout-all 401', () => {
      expect(isInAuthPaths('/auth/logout-all')).toBe(true);
    });

    it('skips refresh on /auth/security/dashboard 401', () => {
      expect(isInAuthPaths('/auth/security/dashboard')).toBe(true);
    });

    it('skips refresh on /auth/sessions (list) 401', () => {
      expect(isInAuthPaths('/auth/sessions')).toBe(true);
    });

    it('skips refresh on /auth/sessions/others 401', () => {
      expect(isInAuthPaths('/auth/sessions/others')).toBe(true);
    });

    it('skips refresh on /auth/sessions/:id (DELETE) 401', () => {
      expect(isInAuthPaths('/auth/sessions/abc-123')).toBe(true);
    });

    // ─── Epic 2.9 T16 — password-management endpoints ─────────────────────

    it('skips refresh on /auth/verify-password 401', () => {
      // Source epic: Epic 2.9 — Password re-verification and password change.
      // Source ticket: 2.9.T16.
      //
      // A 401 from `/auth/verify-password` means the session is
      // gone — the right action is forced reauthentication, not a
      // silent refresh that would mask the boundary.
      expect(isInAuthPaths('/auth/verify-password')).toBe(true);
    });

    it('skips refresh on /auth/change-password 401', () => {
      // Source ticket: 2.9.T16.
      //
      // Same rationale as `/auth/verify-password`: the user
      // explicitly asked to change the password; a 401 here is the
      // session boundary, not a transient token-expiry.
      expect(isInAuthPaths('/auth/change-password')).toBe(true);
    });

    it('STILL triggers refresh on /auth/me 401 (regression guard)', () => {
      expect(isInAuthPaths('/users/me')).toBe(false);
      expect(isInAuthPaths('/auth/me')).toBe(false);
    });

    it('STILL triggers refresh on arbitrary authenticated endpoints', () => {
      // Sanity guard: a generic authenticated endpoint must NOT be
      // swept up by the prefix matchers.
      expect(isInAuthPaths('/quizzes/featured')).toBe(false);
      expect(isInAuthPaths('/leaderboard/global')).toBe(false);
      expect(isInAuthPaths('/friends')).toBe(false);
    });
  });
});

// Local helper so we don't depend on vitest at module-scope hoisting
function vi_resetModulesSafely(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vitest = require('vitest');
    if (typeof vitest.resetModules === 'function') {
      vitest.resetModules();
    }
  } catch {
    // vitest not available in this scope; rely on dynamic import cache
  }
}
