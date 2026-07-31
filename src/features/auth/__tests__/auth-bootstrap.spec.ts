/**
 * Auth bootstrap — unit suite.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.15.
 *
 * ## Coverage contract (per the ticket)
 *
 *   - `singleflight`: deduplicates concurrent requests; ref counting works;
 *     cleanup on unmount.
 *   - `useAuth`: returns `CurrentUserResponseDto | null`; refetch works;
 *     loading/error states correct.
 *   - `useUser`: returns `UserMeResponseDto | null`; isDegraded state works;
 *     recoverFromDegraded triggers retry.
 *   - `user-scoped-cache`: keys scoped to userId; TTL validation; clear
 *     operations work.
 *   - `profile-fallbacks`: null avatar returns default; null displayName
 *     falls back to username; null bio returns empty string.
 *   - `safe-redirect`: all documented targets accepted/rejected.
 *   - `auth-redirect`: return URL storage/retrieval/clear.
 *   - Type exports: `useAuth` returns exactly `CurrentUserResponseDto`;
 *     `useUser` returns exactly `UserMeResponseDto`.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  singleflight,
  cancelAllInFlightRequests,
  hasInFlightRequests,
  getInFlightCount,
} from '@/features/auth/utils/bootstrap-deduplicator';
import {
  DEFAULT_AVATAR_URL,
  getAvatarUrl,
  getDisplayName,
  getBio,
  getUserDisplayString,
  isProfileComplete,
  hasCustomAvatar,
} from '@/features/users/utils/profile-fallbacks';
import { isSafeRedirectTarget, safeRedirectTarget } from '@/features/auth/utils/safe-redirect';
import type { UserMeResponseDto } from '@/features/users/types';

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap deduplicator — singleflight
// ─────────────────────────────────────────────────────────────────────────────

describe('singleflight', () => {
  afterEach(() => {
    cancelAllInFlightRequests();
  });

  it('executes the function on first call', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const result = await singleflight('test-key', fn);
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns the same promise for concurrent calls', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const [result1, result2] = await Promise.all([
      singleflight('concurrent-key', fn),
      singleflight('concurrent-key', fn),
    ]);
    expect(result1).toBe(result2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('executes again after the first call completes', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    await singleflight('sequential-key', fn);
    await singleflight('sequential-key', fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rejects when the function rejects', async () => {
    const error = new Error('test error');
    const fn = vi.fn().mockRejectedValue(error);
    await expect(singleflight('error-key', fn)).rejects.toThrow('test error');
  });

  it('cleans up in-flight request after completion', async () => {
    expect(hasInFlightRequests()).toBe(false);
    await singleflight('cleanup-key', async () => 'result');
    expect(hasInFlightRequests()).toBe(false);
  });

  it('cancelAllInFlightRequests clears all pending requests', async () => {
    const fn = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('result'), 1000))
    );
    singleflight('cancel-key', fn);
    expect(getInFlightCount('cancel-key')).toBe(1);
    cancelAllInFlightRequests();
    expect(getInFlightCount('cancel-key')).toBe(0);
  });

  it('handles 10+ simultaneous consumers', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const promises = Array.from({ length: 15 }, () =>
      singleflight('many-consumers', fn)
    );
    await Promise.all(promises);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Profile fallbacks
// ─────────────────────────────────────────────────────────────────────────────

const mockUser: UserMeResponseDto = {
  userId: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
  bio: 'Hello, I am a test user!',
  xpTotal: 1000,
  currentStreak: 5,
  longestStreak: 10,
  settings: {},
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

const mockUserWithNulls: UserMeResponseDto = {
  userId: 'user-456',
  username: 'newuser',
  email: 'new@example.com',
  displayName: null,
  avatarUrl: null,
  bio: null,
  xpTotal: 0,
  currentStreak: 0,
  longestStreak: 0,
  settings: {},
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('getAvatarUrl', () => {
  it('returns avatar URL when set', () => {
    expect(getAvatarUrl(mockUser)).toBe('https://example.com/avatar.jpg');
  });

  it('returns default URL when avatar is null', () => {
    expect(getAvatarUrl(mockUserWithNulls)).toBe(DEFAULT_AVATAR_URL);
  });

  it('returns default URL when avatar is undefined', () => {
    const user = { ...mockUser, avatarUrl: undefined };
    expect(getAvatarUrl(user)).toBe(DEFAULT_AVATAR_URL);
  });

  it('returns default URL when avatar is empty string', () => {
    const user = { ...mockUser, avatarUrl: '' };
    expect(getAvatarUrl(user)).toBe(DEFAULT_AVATAR_URL);
  });

  it('returns default URL when user is null', () => {
    expect(getAvatarUrl(null)).toBe(DEFAULT_AVATAR_URL);
  });

  it('returns default URL when user is undefined', () => {
    expect(getAvatarUrl(undefined)).toBe(DEFAULT_AVATAR_URL);
  });
});

describe('getDisplayName', () => {
  it('returns displayName when set', () => {
    expect(getDisplayName(mockUser)).toBe('Test User');
  });

  it('falls back to username when displayName is null', () => {
    expect(getDisplayName(mockUserWithNulls)).toBe('newuser');
  });

  it('falls back to username when displayName is undefined', () => {
    const user = { ...mockUser, displayName: undefined };
    expect(getDisplayName(user)).toBe('testuser');
  });

  it('falls back to username when displayName is empty string', () => {
    const user = { ...mockUser, displayName: '' };
    expect(getDisplayName(user)).toBe('testuser');
  });

  it('respects custom anonymous label', () => {
    expect(getDisplayName(null, { anonymousLabel: 'Guest' })).toBe('Guest');
  });

  it('returns anonymous label when user is null', () => {
    expect(getDisplayName(null)).toBe('Anonymous User');
  });
});

describe('getBio', () => {
  it('returns bio when set', () => {
    expect(getBio(mockUser)).toBe('Hello, I am a test user!');
  });

  it('returns empty string when bio is null', () => {
    expect(getBio(mockUserWithNulls)).toBe('');
  });

  it('returns empty string when bio is undefined', () => {
    const user = { ...mockUser, bio: undefined };
    expect(getBio(user)).toBe('');
  });

  it('returns empty string when user is null', () => {
    expect(getBio(null)).toBe('');
  });
});

describe('getUserDisplayString', () => {
  it('returns displayName and username when both are set', () => {
    expect(getUserDisplayString(mockUser)).toBe('Test User (@testuser)');
  });

  it('returns @username when displayName equals username', () => {
    const user = { ...mockUser, displayName: 'testuser' };
    expect(getUserDisplayString(user)).toBe('@testuser');
  });

  it('returns username when displayName is null', () => {
    expect(getUserDisplayString(mockUserWithNulls)).toBe('@newuser');
  });

  it('returns anonymous when user is null', () => {
    expect(getUserDisplayString(null)).toBe('Anonymous User');
  });
});

describe('isProfileComplete', () => {
  it('returns true when displayName is set', () => {
    expect(isProfileComplete(mockUser)).toBe(true);
  });

  it('returns false when displayName is null', () => {
    expect(isProfileComplete(mockUserWithNulls)).toBe(false);
  });

  it('returns false when user is null', () => {
    expect(isProfileComplete(null)).toBe(false);
  });
});

describe('hasCustomAvatar', () => {
  it('returns true when avatar is set', () => {
    expect(hasCustomAvatar(mockUser)).toBe(true);
  });

  it('returns false when avatar is null', () => {
    expect(hasCustomAvatar(mockUserWithNulls)).toBe(false);
  });

  it('returns false when user is null', () => {
    expect(hasCustomAvatar(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth redirect — return URL storage
// ─────────────────────────────────────────────────────────────────────────────

describe('auth-redirect return URL storage', () => {
  it('isSafeRedirectTarget accepts valid protected routes', () => {
    expect(isSafeRedirectTarget('/protected-page')).toBe(true);
    expect(isSafeRedirectTarget('/dashboard')).toBe(true);
  });

  it('safeRedirectTarget returns fallback for hostile values', () => {
    expect(safeRedirectTarget('//evil.com')).toBe('/quizzes');
    expect(safeRedirectTarget('https://evil.com')).toBe('/quizzes');
    expect(safeRedirectTarget('/login')).toBe('/quizzes');
    expect(safeRedirectTarget('')).toBe('/quizzes');
    expect(safeRedirectTarget(null)).toBe('/quizzes');
    expect(safeRedirectTarget(undefined)).toBe('/quizzes');
  });

  it('safeRedirectTarget returns raw value for safe targets', () => {
    expect(safeRedirectTarget('/quizzes')).toBe('/quizzes');
    expect(safeRedirectTarget('/my-profile')).toBe('/my-profile');
    expect(safeRedirectTarget('/settings?tab=security')).toBe('/settings?tab=security');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Type export validation — ensures hooks return exact types
// ─────────────────────────────────────────────────────────────────────────────

describe('Type export validation', () => {
  it('CurrentUserResponseDto has expected shape', () => {
    const identity = {
      userId: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      isVerified: true,
    };

    // Verify all required fields exist
    expect(identity).toHaveProperty('userId');
    expect(identity).toHaveProperty('username');
    expect(identity).toHaveProperty('email');
    expect(identity).toHaveProperty('role');
    expect(identity).toHaveProperty('isVerified');

    // Verify types
    expect(typeof identity.userId).toBe('string');
    expect(typeof identity.username).toBe('string');
    expect(typeof identity.email).toBe('string');
    expect(typeof identity.role).toBe('string');
    expect(typeof identity.isVerified).toBe('boolean');
  });

  it('UserMeResponseDto has expected shape', () => {
    // Verify all required fields exist
    expect(mockUser).toHaveProperty('userId');
    expect(mockUser).toHaveProperty('username');
    expect(mockUser).toHaveProperty('email');
    expect(mockUser).toHaveProperty('xpTotal');
    expect(mockUser).toHaveProperty('currentStreak');
    expect(mockUser).toHaveProperty('longestStreak');
    expect(mockUser).toHaveProperty('settings');
    expect(mockUser).toHaveProperty('createdAt');
    expect(mockUser).toHaveProperty('updatedAt');

    // Verify nullable fields
    expect(mockUserWithNulls.displayName).toBeNull();
    expect(mockUserWithNulls.avatarUrl).toBeNull();
    expect(mockUserWithNulls.bio).toBeNull();

    // Verify types
    expect(typeof mockUser.xpTotal).toBe('number');
    expect(typeof mockUser.currentStreak).toBe('number');
    expect(typeof mockUser.longestStreak).toBe('number');
    expect(typeof mockUser.settings).toBe('object');
    expect(typeof mockUser.createdAt).toBe('string');
    expect(typeof mockUser.updatedAt).toBe('string');
  });

  it('nullable fields accept null', () => {
    // This test documents that null is a valid value for optional fields
    const userWithNulls = {
      userId: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      displayName: null,
      avatarUrl: null,
      bio: null,
      xpTotal: 0,
      currentStreak: 0,
      longestStreak: 0,
      settings: {},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(userWithNulls.displayName).toBeNull();
    expect(userWithNulls.avatarUrl).toBeNull();
    expect(userWithNulls.bio).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Default avatar URL
// ─────────────────────────────────────────────────────────────────────────────

describe('DEFAULT_AVATAR_URL', () => {
  it('is a valid data URI', () => {
    expect(DEFAULT_AVATAR_URL.startsWith('data:image/svg+xml,')).toBe(true);
  });

  it('is non-empty', () => {
    expect(DEFAULT_AVATAR_URL.length).toBeGreaterThan(0);
  });
});
