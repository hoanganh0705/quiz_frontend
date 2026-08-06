/**
 * `useAdminFeatureFlag.spec.tsx` — Locks the `useAdminFeatureFlag`
 * selector contract (TKT-7.1.B5).
 *
 * Verifies:
 *   - Defaults to `{ isLive: false, isPlaceholder: true }` when
 *     `getFeatureFlagValue` returns `'placeholder'`.
 *   - Returns `{ isLive: true, isPlaceholder: false }` when
 *     `getFeatureFlagValue` returns `'live'`.
 *   - The returned document carries the requested flag name and the
 *     narrowed value type.
 */

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockGetFeatureFlagValue = vi.fn();

vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) =>
    mockGetFeatureFlagValue(...args),
}));

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';

afterEach(() => {
  mockGetFeatureFlagValue.mockReset();
});

describe('admin/hooks — useAdminFeatureFlag', () => {
  it('returns isPlaceholder=true when the flag resolves to placeholder', () => {
    mockGetFeatureFlagValue.mockReturnValueOnce('placeholder');

    const { result } = renderHook(() =>
      useAdminFeatureFlag('phase7_admin'),
    );

    expect(result.current).toEqual({
      flag: 'phase7_admin',
      value: 'placeholder',
      isLive: false,
      isPlaceholder: true,
    });
    expect(mockGetFeatureFlagValue).toHaveBeenCalledWith('phase7_admin');
  });

  it('returns isLive=true when the flag resolves to live', () => {
    mockGetFeatureFlagValue.mockReturnValueOnce('live');

    const { result } = renderHook(() =>
      useAdminFeatureFlag('phase7_admin_user_role'),
    );

    expect(result.current).toEqual({
      flag: 'phase7_admin_user_role',
      value: 'live',
      isLive: true,
      isPlaceholder: false,
    });
    expect(mockGetFeatureFlagValue).toHaveBeenCalledWith(
      'phase7_admin_user_role',
    );
  });

  it('narrows unknown values to placeholder defensively', () => {
    mockGetFeatureFlagValue.mockReturnValueOnce('garbage');

    const { result } = renderHook(() =>
      useAdminFeatureFlag('phase7_admin_ranking'),
    );

    expect(result.current.value).toBe('placeholder');
    expect(result.current.isLive).toBe(false);
    expect(result.current.isPlaceholder).toBe(true);
  });
});