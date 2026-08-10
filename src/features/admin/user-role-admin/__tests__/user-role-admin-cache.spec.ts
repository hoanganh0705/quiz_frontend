/**
 * `features/admin/user-role-admin/__tests__/user-role-admin-cache.spec.ts`
 *
 * Source epic:   Epic 7.10 — User Role Grant.
 * Source ticket: TKT-7.10.B3.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  USER_ROLE_ADMIN_PREFIX,
  userRoleListKey,
  userRoleAdminSearchKey,
  invalidateUserRoleCache,
} from '../user-role-admin-cache';

const mutateMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: mutateMock,
  };
});

describe('user-role-admin-cache', () => {
  describe('USER_ROLE_ADMIN_PREFIX', () => {
    it('should be a non-empty string', () => {
      expect(USER_ROLE_ADMIN_PREFIX).toBeTruthy();
      expect(USER_ROLE_ADMIN_PREFIX.length).toBeGreaterThan(0);
    });
  });

  describe('userRoleListKey', () => {
    it('should return a non-empty string', () => {
      const key = userRoleListKey('user-123');
      expect(key).toBeTruthy();
      expect(key.length).toBeGreaterThan(0);
    });

    it('should include the user ID', () => {
      const userId = 'user-123';
      const key = userRoleListKey(userId);
      expect(key).toContain(userId);
    });

    it('should be deterministic for the same input', () => {
      const key1 = userRoleListKey('user-123');
      const key2 = userRoleListKey('user-123');
      expect(key1).toBe(key2);
    });

    it('should produce different keys for different user IDs', () => {
      const key1 = userRoleListKey('user-123');
      const key2 = userRoleListKey('user-456');
      expect(key1).not.toBe(key2);
    });
  });

  describe('userRoleAdminSearchKey', () => {
    it('should return a non-empty string', () => {
      const key = userRoleAdminSearchKey('test');
      expect(key).toBeTruthy();
      expect(key.length).toBeGreaterThan(0);
    });

    it('should include the query', () => {
      const query = 'test-query';
      const key = userRoleAdminSearchKey(query);
      expect(key).toContain(query);
    });

    it('should be deterministic for the same input', () => {
      const key1 = userRoleAdminSearchKey('test');
      const key2 = userRoleAdminSearchKey('test');
      expect(key1).toBe(key2);
    });

    it('should produce different keys for different queries', () => {
      const key1 = userRoleAdminSearchKey('query1');
      const key2 = userRoleAdminSearchKey('query2');
      expect(key1).not.toBe(key2);
    });
  });

  describe('invalidateUserRoleCache', () => {
    beforeEach(() => {
      mutateMock.mockClear();
    });

    it('should call mutate with the correct key', async () => {
      const userId = 'user-123';

      await invalidateUserRoleCache(userId);

      expect(mutateMock).toHaveBeenCalledWith(userRoleListKey(userId));
    });

    it('should also invalidate search cache when query is provided', async () => {
      const userId = 'user-123';
      const searchQuery = 'test-query';

      await invalidateUserRoleCache(userId, searchQuery);

      expect(mutateMock).toHaveBeenCalledWith(userRoleListKey(userId));
      expect(mutateMock).toHaveBeenCalledWith(
        userRoleAdminSearchKey(searchQuery),
      );
    });

    it('should only call mutate once when no search query', async () => {
      const userId = 'user-123';

      await invalidateUserRoleCache(userId);

      expect(mutateMock).toHaveBeenCalledTimes(1);
    });
  });
});
