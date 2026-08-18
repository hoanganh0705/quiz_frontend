

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
revokeUserRole: vi.fn().mockResolvedValue({
userId: 'user-123',
role: 'user_grant_role',
grantedAt: '2024-01-01T00:00:00.000Z',
  }),
}));

vi.mock('swr', () => ({
mutate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/auth/hooks/use-auth', () => ({
useAuth: vi.fn().mockReturnValue({
currentUser: { userId: 'current-user-123' },
  }),
}));

import { useRevokeUserRole } from '../useRevokeUserRole';

describe('useRevokeUserRole', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

it('returns correct initial state', () => {
const { result } = renderHook(() => useRevokeUserRole());

expect(result.current.isPending).toBe(false);
expect(result.current.error).toBeNull();
expect(result.current.isSelfRevoke).toBe(false);
expect(result.current.audit.before).toBeNull();
expect(result.current.audit.after).toBeNull();
  });

it('has reset function', () => {
const { result } = renderHook(() => useRevokeUserRole());

expect(typeof result.current.reset).toBe('function');
  });

it('has revoke function', () => {
const { result } = renderHook(() => useRevokeUserRole());

expect(typeof result.current.revoke).toBe('function');
  });

it('reset clears error and isSelfRevoke state', async () => {
const { result } = renderHook(() => useRevokeUserRole());

try {
await result.current.revoke('current-user-123', 'user_grant_role');
    } catch {
      // Expected to reject
    }

act(() => {
result.current.reset();
    });

expect(result.current.error).toBeNull();
expect(result.current.isPending).toBe(false);
expect(result.current.isSelfRevoke).toBe(false);
  });
});
