

import { renderHook } from '@testing-library/react';
import React from 'react';

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: vi.fn().mockReturnValue('live'),
}));

vi.mock('@/features/admin/services/user-role-admin.service', () => ({
getUserRoles: vi.fn().mockResolvedValue([
{ role: 'user_grant_role', grantedAt: '2024-01-01T00:00:00.000Z' },
  ]),
}));

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
