/**
 * useBadgeCatalog unit tests.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBadgeCatalog } from '../useBadgeCatalog';

const { mockListBadges, mockGetFeatureFlagValue } = vi.hoisted(() => ({
  mockListBadges: vi.fn(),
  mockGetFeatureFlagValue: vi.fn(),
}));

vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock('@/features/achievements/services/achievements.service', () => ({
  listBadges: (...args: unknown[]) => mockListBadges(...args),
}));

const FIXTURE = [
  { id: 'b1', code: 'BRONZE_QUIZ', name: 'Bronze Quiz', description: null, rarity: 'BRONZE', earnedCount: 10 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFeatureFlagValue.mockReturnValue('live');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBadgeCatalog', () => {
  it('success returns projected badges', async () => {
    mockListBadges.mockResolvedValueOnce(FIXTURE);
    const { result } = renderHook(() => useBadgeCatalog());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.badges).toHaveLength(1);
    expect(result.current.badges[0].id).toBe('b1');
  });
});
