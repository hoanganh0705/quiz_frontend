

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserBadges } from '../useUserBadges';

const VALID_USER_ID = '00000000-0000-4000-8000-000000000001';

const { mockGetUserBadges, mockGetFeatureFlagValue } = vi.hoisted(() => ({
mockGetUserBadges: vi.fn(),
mockGetFeatureFlagValue: vi.fn(),
}));

vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock('@/lib/api', () => ({
getAchievements: () => ({
getPublicAchievementProfile: (...args: unknown[]) => mockGetUserBadges(...args),
  }),
}));

const FEATURED_BADGES_FIXTURE = [
{ badgeId: 'b1', badgeName: 'Bronze Quiz', rarity: 'BRONZE' },
{ badgeId: 'b2', badgeName: 'Silver Quiz', rarity: 'SILVER' },
];

function makeProfile(fixture = FEATURED_BADGES_FIXTURE) {
return {
data: {
userId: VALID_USER_ID,
totalBadges: fixture.length,
rareBadges: 0,
highestRank: null,
featuredBadges: fixture,
    },
  };
}

beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue('live');
});

afterEach(() => {
vi.restoreAllMocks();
});

function renderUseUserBadges(userId: string | null) {
return renderHook(() => useUserBadges(userId));
}

describe('TKT-7.8.C1 — useUserBadges', () => {
it('null userId returns empty badges; no fetch', async () => {
const { result } = renderUseUserBadges(null);
await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });
expect(result.current.badges).toEqual([]);
expect(mockGetUserBadges).not.toHaveBeenCalled();
  });

it('success returns featured badges', async () => {
mockGetUserBadges.mockResolvedValueOnce(makeProfile());
const { result } = renderUseUserBadges(VALID_USER_ID);
await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });
expect(result.current.badges).toHaveLength(2);
expect(result.current.badges[0].badgeId).toBe('b1');
  });
});
