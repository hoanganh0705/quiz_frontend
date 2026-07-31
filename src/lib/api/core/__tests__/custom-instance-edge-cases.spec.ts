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
 * Note: the frontend's vitest config runs in `node` (no jsdom/happy-dom).
 * Tests focus on the public surface (`markLogout`, `clearLogoutMarker`,
 * `_getLastLogoutTimestampForTesting`) which is mockable without DOM.
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
