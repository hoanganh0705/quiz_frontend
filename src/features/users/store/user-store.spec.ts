/**
 * `user-store.spec.ts` — Phase 6 unit test for the reactive 429 retry-after
 * behaviour (W-24).
 *
 * Verifies that `fetchCurrentUser`:
 *   1. Falls back to a documented default cooldown when the backend does
 *      NOT stamp a retry-after value (e.g. 5xx, 404).
 *   2. Honours the server-supplied `retryAfter` value to the millisecond
 *      (no off-by-one, no rounding).
 *   3. Clears the cooldown on success.
 *   4. Skips the wire entirely while the cooldown is still active.
 *   5. Returns the cached `user` on subsequent calls during the cooldown
 *      (not `null`).
 *
 * Phase 6 contract: a 30-second hardcoded cooldown is replaced by a
 * reactive `retryAfterAt` timestamp read from the RFC 7807
 * `extensions.retryAfter` field exposed by `ApiError`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist all the mocks before the store import — the store subscribes
// to the profile-broadcast-channel at module-evaluation time and
// would otherwise hit real browser APIs under jsdom.
vi.mock('@/features/users/services/users.reads.service', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/lib/api/core/profile-broadcast-channel', () => ({
  subscribeToProfileEvents: vi.fn(() => () => {}),
}));
vi.mock('@/features/auth/utils/auth-cookies', () => ({
  getAuthToken: vi.fn(() => 'mock-auth-token'),
}));

import { getCurrentUser } from '@/features/users/services/users.reads.service';
import { ApiError } from '@/lib/api/core/ApiError';
import { useUserStore } from '@/features/users/store/user-store';

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

const FALLBACK_COOLDOWN_MS = 30_000;

function makeApiError(status: number, retryAfterSeconds?: number): ApiError {
  return new ApiError({
    config: undefined,
    request: undefined,
    response: {
      status,
      data: {
        status, // Required by Rfc7807Body type
        code: status === 429 ? 'GLOBAL_RATE_LIMITED' : 'INTERNAL',
        detail: 'rate limited',
        extensions: retryAfterSeconds !== undefined
          ? { retryAfter: retryAfterSeconds }
          : undefined,
      },
    },
    isAxiosError: true,
    name: 'AxiosError',
    message: `Mock ${status}`,
    code: status === 429 ? 'GLOBAL_RATE_LIMITED' : 'INTERNAL',
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

describe('useUserStore.fetchCurrentUser — reactive 429 retry-after', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store state between tests (zustand stores are singletons).
    useUserStore.setState({
      user: null,
      isLoading: false,
      error: null,
      retryAfterAt: null,
    });
    mockedGetCurrentUser.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses the server-supplied retry-after value when present (no rounding)', async () => {
    const now = new Date('2026-08-11T07:00:00.000Z');
    vi.setSystemTime(now);
    mockedGetCurrentUser.mockRejectedValueOnce(makeApiError(429, 7));

    const result = await useUserStore.getState().fetchCurrentUser();

    expect(result).toBeNull();
    const state = useUserStore.getState();
    expect(state.retryAfterAt).toBe(now.getTime() + 7_000);
    expect(state.error).toMatch(/rate limited/);
  });

  it('falls back to the documented default cooldown when the backend omits retry-after', async () => {
    const now = new Date('2026-08-11T07:00:00.000Z');
    vi.setSystemTime(now);
    // 500 server error — no retry-after stamped.
    mockedGetCurrentUser.mockRejectedValueOnce(makeApiError(500));

    const result = await useUserStore.getState().fetchCurrentUser();

    expect(result).toBeNull();
    const state = useUserStore.getState();
    expect(state.retryAfterAt).toBe(now.getTime() + FALLBACK_COOLDOWN_MS);
  });

  it('skips the wire entirely while the cooldown is still active and returns the cached user', async () => {
    const now = new Date('2026-08-11T07:00:00.000Z');
    vi.setSystemTime(now);
    const cached = {
      userId: 'u1',
      username: 'cached',
      email: 'cached@example.com',
      xpTotal: 0,
      currentStreak: 0,
      longestStreak: 0,
      settings: {
        emailNotifications: true,
        pushNotifications: true,
        leaderboardVisible: true,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    useUserStore.setState({ user: cached });
    useUserStore.setState({ retryAfterAt: now.getTime() + 5_000 });

    const result = await useUserStore.getState().fetchCurrentUser();

    expect(mockedGetCurrentUser).not.toHaveBeenCalled();
    expect(result).toBe(cached);
  });

  it('refetches normally once the cooldown has elapsed', async () => {
    const start = new Date('2026-08-11T07:00:00.000Z');
    vi.setSystemTime(start);
    mockedGetCurrentUser.mockRejectedValueOnce(makeApiError(429, 1));
    await useUserStore.getState().fetchCurrentUser();

    expect(useUserStore.getState().retryAfterAt).toBe(start.getTime() + 1_000);

    // Advance past the cooldown; the next call should hit the wire again.
    vi.setSystemTime(new Date(start.getTime() + 1_500));
    const refreshed = {
      userId: 'u2',
      username: 'refreshed',
      email: 'r@example.com',
      xpTotal: 100,
      currentStreak: 2,
      longestStreak: 4,
      settings: {
        emailNotifications: true,
        pushNotifications: true,
        leaderboardVisible: true,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    mockedGetCurrentUser.mockResolvedValueOnce(refreshed);

    const result = await useUserStore.getState().fetchCurrentUser();

    expect(mockedGetCurrentUser).toHaveBeenCalledTimes(2);
    expect(result).toBe(refreshed);
    expect(useUserStore.getState().error).toBeNull();
    expect(useUserStore.getState().retryAfterAt).toBeNull();
  });

  it('clears the cooldown on a successful fetch', async () => {
    const start = new Date('2026-08-11T07:00:00.000Z');
    vi.setSystemTime(start);
    // Seed a leftover cooldown that should be wiped on success.
    // Advance the clock past the seeded window so the wire is
    // actually hit on the first call.
    vi.setSystemTime(new Date(start.getTime() + 65_000));
    useUserStore.setState({ retryAfterAt: start.getTime() + 60_000 });

    const fetched = {
      userId: 'u3',
      username: 'fresh',
      email: 'f@example.com',
      xpTotal: 0,
      currentStreak: 0,
      longestStreak: 0,
      settings: {
        emailNotifications: true,
        pushNotifications: true,
        leaderboardVisible: true,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    mockedGetCurrentUser.mockResolvedValueOnce(fetched);

    const result = await useUserStore.getState().fetchCurrentUser();

    expect(result).toBe(fetched);
    expect(useUserStore.getState().retryAfterAt).toBeNull();
    expect(useUserStore.getState().error).toBeNull();
  });
});