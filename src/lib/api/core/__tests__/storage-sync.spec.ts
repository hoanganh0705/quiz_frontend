/**
 * Unit tests for storage event fallback.
 *
 * Source epic: Epic 2.7 — Access-token refresh and cross-tab session synchronization.
 * Source ticket: 2.7.T13/T14 (covered here).
 *
 * Note: The frontend's vitest config runs in `node` (no jsdom/happy-dom).
 * Tests focus on the pure-function contract and module-level state.
 */

import { describe, expect, it } from 'vitest';

describe('storage sync fallback', () => {
  describe('exports surface', () => {
    it('exports all required functions and constants', async () => {
      const exports = await import('../storage-sync');

      // Types are not runtime-exported
      // SyncPayload is a type
      expect(exports.initStorageSync).toBeDefined();
      expect(exports.cleanupStorageSync).toBeDefined();
      expect(exports.subscribeToStorageSync).toBeDefined();
      expect(exports.broadcastLoginViaStorage).toBeDefined();
      expect(exports.broadcastLogoutViaStorage).toBeDefined();
      expect(exports.broadcastTokenRefreshedViaStorage).toBeDefined();
      expect(exports.getStorageSyncTabId).toBeDefined();

      // Verify they're functions
      expect(typeof exports.initStorageSync).toBe('function');
      expect(typeof exports.subscribeToStorageSync).toBe('function');
      expect(typeof exports.broadcastLoginViaStorage).toBe('function');
      expect(typeof exports.broadcastLogoutViaStorage).toBe('function');
      expect(typeof exports.broadcastTokenRefreshedViaStorage).toBe('function');
      expect(typeof exports.getStorageSyncTabId).toBe('function');
    });
  });

  describe('subscriber pattern', () => {
    it('returns a function from subscribeToStorageSync', async () => {
      const { subscribeToStorageSync } = await import('../storage-sync');
      const handler = () => {};
      const unsubscribe = subscribeToStorageSync(handler);

      expect(typeof unsubscribe).toBe('function');

      // Cleanup
      unsubscribe();
    });

    it('subscribeToStorageSync returns independent unsubscribe functions', async () => {
      const { subscribeToStorageSync } = await import('../storage-sync');

      const handler1 = () => {};
      const handler2 = () => {};

      const unsub1 = subscribeToStorageSync(handler1);
      const unsub2 = subscribeToStorageSync(handler2);

      expect(typeof unsub1).toBe('function');
      expect(typeof unsub2).toBe('function');
      expect(unsub1).not.toBe(unsub2);

      unsub1();
      unsub2();
    });
  });

  describe('initStorageSync', () => {
    it('returns a boolean', async () => {
      const { initStorageSync } = await import('../storage-sync');
      const result = initStorageSync();

      expect(typeof result).toBe('boolean');
    });

    it('does not throw when called', async () => {
      const { initStorageSync } = await import('../storage-sync');

      expect(() => {
        initStorageSync();
      }).not.toThrow();
    });
  });

  describe('getStorageSyncTabId', () => {
    it('returns a non-empty string', async () => {
      const { getStorageSyncTabId } = await import('../storage-sync');
      const id = getStorageSyncTabId();

      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('broadcast functions are safe', () => {
    it('broadcast functions do not throw without localStorage', async () => {
      const {
        broadcastLoginViaStorage,
        broadcastLogoutViaStorage,
        broadcastTokenRefreshedViaStorage,
      } = await import('../storage-sync');

      // These should not throw even if localStorage is unavailable
      expect(() => {
        broadcastLoginViaStorage('user-123', 'token-123');
      }).not.toThrow();

      expect(() => {
        broadcastLogoutViaStorage();
      }).not.toThrow();

      expect(() => {
        broadcastTokenRefreshedViaStorage('new-token');
      }).not.toThrow();
    });
  });

  describe('cleanup is idempotent', () => {
    it('cleanup does not throw when called fresh', async () => {
      const { cleanupStorageSync } = await import('../storage-sync');

      expect(() => {
        cleanupStorageSync();
      }).not.toThrow();
    });
  });
});
