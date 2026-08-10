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
      useAdminFeatureFlag('admin_live'),
    );

    expect(result.current).toEqual({
      flag: 'admin_live',
      value: 'placeholder',
      isLive: false,
      isPlaceholder: true,
    });
    expect(mockGetFeatureFlagValue).toHaveBeenCalledWith('admin_live');
  });

  it('returns isLive=true when the flag resolves to live', () => {
    mockGetFeatureFlagValue.mockReturnValueOnce('live');

    const { result } = renderHook(() =>
      useAdminFeatureFlag('admin_user_role_live'),
    );

    expect(result.current).toEqual({
      flag: 'admin_user_role_live',
      value: 'live',
      isLive: true,
      isPlaceholder: false,
    });
    expect(mockGetFeatureFlagValue).toHaveBeenCalledWith(
      'admin_user_role_live',
    );
  });

  it('narrows unknown values to placeholder defensively', () => {
    mockGetFeatureFlagValue.mockReturnValueOnce('garbage');

    const { result } = renderHook(() =>
      useAdminFeatureFlag('admin_ranking_live'),
    );

    expect(result.current.value).toBe('placeholder');
    expect(result.current.isLive).toBe(false);
    expect(result.current.isPlaceholder).toBe(true);
  });
});