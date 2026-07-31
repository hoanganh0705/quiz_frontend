/**
 * Unit tests for refresh cooldown manager.
 *
 * Source epic: Epic 2.7 — Access-token refresh and cross-tab session synchronization.
 * Source ticket: 2.7.T21.
 *
 * Tests use vi.useFakeTimers to control time for deterministic testing
 * of the cooldown behavior.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  isInCooldown,
  startCooldown,
  clearCooldown,
  getRemainingCooldownMs,
  _resetCooldownForTesting,
} from '../refresh-cooldown';

describe('refresh cooldown manager', () => {
  // Track fake time for Date.now() mocking
  let fakeTime = 0;

  beforeEach(() => {
    // Reset cooldown state before each test
    _resetCooldownForTesting();
    // Mock Date.now to use our fake time counter
    vi.spyOn(Date, 'now').mockImplementation(() => fakeTime);
  });

  afterEach(() => {
    // Restore Date.now
    vi.restoreAllMocks();
    // Reset fake time counter
    fakeTime = 0;
  });

  // Helper to advance fake time
  const advanceTime = (ms: number) => {
    fakeTime += ms;
  };

  describe('isInCooldown', () => {
    it('returns false initially', () => {
      expect(isInCooldown()).toBe(false);
    });

    it('returns true immediately after startCooldown', () => {
      startCooldown();
      expect(isInCooldown()).toBe(true);
    });

    it('returns true at 999ms (before expiry)', () => {
      startCooldown();
      advanceTime(999);
      expect(isInCooldown()).toBe(true);
    });

    it('returns false at 1000ms (at expiry)', () => {
      startCooldown();
      advanceTime(1000);
      expect(isInCooldown()).toBe(false);
    });

    it('returns false at 2000ms (long after expiry)', () => {
      startCooldown();
      advanceTime(2000);
      expect(isInCooldown()).toBe(false);
    });

    it('returns false after clearCooldown', () => {
      startCooldown();
      advanceTime(500);
      clearCooldown();
      expect(isInCooldown()).toBe(false);
    });
  });

  describe('startCooldown', () => {
    it('starts cooldown when called the first time', () => {
      startCooldown();

      expect(isInCooldown()).toBe(true);
      expect(getRemainingCooldownMs()).toBeGreaterThan(0);
    });

    it('is idempotent: calling twice does not extend cooldown', () => {
      startCooldown();
      advanceTime(500);
      const remainingAt500ms = getRemainingCooldownMs();

      // Call startCooldown again at 500ms
      startCooldown();

      // Remaining time should NOT reset to 1000ms
      // It should remain approximately what it was
      expect(getRemainingCooldownMs()).toBeLessThanOrEqual(remainingAt500ms + 1);
      // And should still have some time remaining (not reset to 1000)
      expect(getRemainingCooldownMs()).toBeGreaterThan(450);
    });

    it('multiple starts do not extend duration', () => {
      startCooldown();
      advanceTime(300);

      // Start cooldown multiple times (should be idempotent)
      startCooldown();
      startCooldown();
      startCooldown();

      // At t=300, remaining = 700ms
      // Advance to t=950, elapsed = 950, remaining = 50
      advanceTime(650);
      expect(isInCooldown()).toBe(true);

      // Advance past 1000ms threshold
      advanceTime(100);
      expect(isInCooldown()).toBe(false);
    });
  });

  describe('clearCooldown', () => {
    it('clears an active cooldown', () => {
      startCooldown();
      expect(isInCooldown()).toBe(true);

      clearCooldown();

      expect(isInCooldown()).toBe(false);
    });

    it('is idempotent: clearing when not in cooldown is a no-op', () => {
      expect(isInCooldown()).toBe(false);

      // Should not throw
      clearCooldown();

      expect(isInCooldown()).toBe(false);
    });

    it('allows a new cooldown to start after clearing', () => {
      // First cooldown
      startCooldown();
      advanceTime(500);
      clearCooldown();

      // Second cooldown should start fresh
      startCooldown();
      expect(isInCooldown()).toBe(true);
      expect(getRemainingCooldownMs()).toBeGreaterThanOrEqual(999);
    });
  });

  describe('getRemainingCooldownMs', () => {
    it('returns 0 when no cooldown is active', () => {
      expect(getRemainingCooldownMs()).toBe(0);
    });

    it('returns approximately 1000ms immediately after start', () => {
      startCooldown();
      const remaining = getRemainingCooldownMs();

      // Allow small variance due to timing
      expect(remaining).toBeGreaterThanOrEqual(999);
      expect(remaining).toBeLessThanOrEqual(1000);
    });

    it('returns decreasing values as time passes', () => {
      startCooldown();

      const atStart = getRemainingCooldownMs();
      advanceTime(300);
      const at300ms = getRemainingCooldownMs();
      advanceTime(300);
      const at600ms = getRemainingCooldownMs();

      expect(atStart).toBeGreaterThan(at300ms);
      expect(at300ms).toBeGreaterThan(at600ms);
    });

    it('returns 0 after cooldown expires', () => {
      startCooldown();
      advanceTime(1500);

      expect(getRemainingCooldownMs()).toBe(0);
    });

    it('returns 0 after clearCooldown', () => {
      startCooldown();
      advanceTime(500);
      clearCooldown();

      expect(getRemainingCooldownMs()).toBe(0);
    });
  });

  describe('cooldown duration is exactly 1000ms', () => {
    it('is active at 999ms', () => {
      startCooldown();
      advanceTime(999);
      expect(isInCooldown()).toBe(true);
    });

    it('is inactive at 1000ms', () => {
      startCooldown();
      advanceTime(1000);
      expect(isInCooldown()).toBe(false);
    });

    it('is inactive at 1001ms', () => {
      startCooldown();
      advanceTime(1001);
      expect(isInCooldown()).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('simulates failed refresh followed by successful refresh', () => {
      // Simulate: refresh fails, start cooldown
      startCooldown();
      expect(isInCooldown()).toBe(true);

      // Rapid subsequent 401s should be blocked
      expect(isInCooldown()).toBe(true);

      // Wait for cooldown to expire
      advanceTime(1000);
      expect(isInCooldown()).toBe(false);

      // Now a new refresh could proceed
    });

    it('simulates successful refresh clears cooldown', () => {
      // Start cooldown (simulating a previous failure)
      startCooldown();
      advanceTime(300);

      // Simulate successful refresh
      clearCooldown();

      // Cooldown should be cleared
      expect(isInCooldown()).toBe(false);

      // Even if we advance time past the original expiry
      advanceTime(1000);

      // Still not in cooldown (was cleared)
      expect(isInCooldown()).toBe(false);
    });
  });
});
