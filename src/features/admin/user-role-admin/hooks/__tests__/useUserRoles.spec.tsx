/**
 * `features/admin/user-role-admin/hooks/__tests__/useUserRoles.spec.ts`
 *
 * Source epic:   Epic 7.10 — User Role Grant.
 * Source ticket: TKT-7.10.C2.
 */

import { renderHook } from '@testing-library/react';
import React from 'react';

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the feature flag
vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: vi.fn().mockReturnValue('live'),
}));

// Mock the service
vi.mock('@/features/admin/services/user-role-admin.service', () => ({
  getUserRoles: vi.fn().mockResolvedValue([
    { role: 'user_grant_role', grantedAt: '2024-01-01T00:00:00.000Z' },
  ]),
}));

// Import after mocks
import { useUserRoles } from '../useUserRoles';

describe('useUserRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty roles when userId is null', () => {
    const { result } = renderHook(() => useUserRoles(null));

    expect(result.current.roles).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns empty roles when userId is undefined', () => {
    const { result } = renderHook(() => useUserRoles(undefined as unknown as string));

    expect(result.current.roles).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns empty roles when userId is empty string', () => {
    const { result } = renderHook(() => useUserRoles(''));

    expect(result.current.roles).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns fallback when flag is placeholder', async () => {
    const { getFeatureFlagValue } = await import('@/lib/feature-flags');
    vi.mocked(getFeatureFlagValue).mockReturnValue('placeholder');

    const { result } = renderHook(() => useUserRoles('user-123'));

    expect(result.current.roles).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('has refetch function', () => {
    const { result } = renderHook(() => useUserRoles('user-123'));

    expect(typeof result.current.refetch).toBe('function');
  });
});
