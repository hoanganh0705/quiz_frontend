

import { renderHook, act } from '@testing-library/react';
import React from 'react';

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: vi.fn().mockReturnValue('live'),
}));

vi.mock('@/lib/admin/admin_live_sentry', () => ({
addRoleGrantBreadcrumb: vi.fn(),
}));

vi.mock('@/features/admin/services/user-role-admin.service', () => ({
grantUserRole: vi.fn().mockResolvedValue({
userId: 'user-123',
role: 'user_grant_role',
grantedAt: '2024-01-01T00:00:00.000Z',
  }),
}));

vi.mock('swr', () => ({
mutate: vi.fn().mockResolvedValue(undefined),
}));

import { useGrantUserRole } from '../useGrantUserRole';

describe('useGrantUserRole', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

it('returns correct initial state', () => {
const { result } = renderHook(() => useGrantUserRole());

expect(result.current.isPending).toBe(false);
expect(result.current.error).toBeNull();
expect(result.current.audit.before).toBeNull();
expect(result.current.audit.after).toBeNull();
  });

it('has reset function', () => {
const { result } = renderHook(() => useGrantUserRole());

expect(typeof result.current.reset).toBe('function');
  });

it('has grant function', () => {
const { result } = renderHook(() => useGrantUserRole());

expect(typeof result.current.grant).toBe('function');
  });

it('reset clears error state', async () => {
const { result } = renderHook(() => useGrantUserRole());

try {
await result.current.grant('user-123', 'invalid_role' as any);
    } catch {
      // Expected to reject
    }

act(() => {
result.current.reset();
    });

expect(result.current.error).toBeNull();
expect(result.current.isPending).toBe(false);
  });
});
