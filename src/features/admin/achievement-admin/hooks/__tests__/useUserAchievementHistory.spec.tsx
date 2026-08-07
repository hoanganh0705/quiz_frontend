/**
 * useUserAchievementHistory unit tests.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUserAchievementHistory } from '../useUserAchievementHistory';

const VALID_USER_ID = '00000000-0000-4000-8000-000000000001';

const { mockGetFeatureFlagValue, mockGetUserAchievementHistory } = vi.hoisted(() => ({
  mockGetFeatureFlagValue: vi.fn(),
  mockGetUserAchievementHistory: vi.fn(),
}));

vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock('@/features/achievements/services/achievements.service', () => ({
  getUserAchievementHistory: (...args: unknown[]) => mockGetUserAchievementHistory(...args),
}));

function makePage(items: object[], page: number, hasMore: boolean) {
  return {
    data: items,
    meta: {
      pagination: {
        kind: 'offset',
        page,
        limit: 20,
        total: hasMore ? 40 : items.length,
        hasMore,
      },
    },
  };
}

const ENTRY = {
  userBadgeId: 'ub-a',
  userId: VALID_USER_ID,
  badgeId: 'badge-a',
  badgeSlug: 'badge-a',
  badgeName: 'Badge A',
  badgeType: 'quiz',
  badgeCategory: 'performance',
  earnedAt: '2025-01-01T00:00:00Z',
  badgeVersion: '1',
  expiresAt: null,
  revokedAt: null,
  revocationReason: null,
  metadata: {},
  isActive: true,
};

beforeEach(() => {
  mockGetFeatureFlagValue.mockReturnValue('live');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useUserAchievementHistory', () => {
  it('null userId returns empty history; no fetch', async () => {
    const { result } = renderHook(() => useUserAchievementHistory(null));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.history).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(mockGetUserAchievementHistory).not.toHaveBeenCalled();
  });

  it('success returns history items', async () => {
    mockGetUserAchievementHistory.mockResolvedValueOnce(makePage([ENTRY], 0, false));
    const { result } = renderHook(() => useUserAchievementHistory(VALID_USER_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].badgeName).toBe('Badge A');
  });
});
