

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/users/hooks/use-user', () => ({
useUser: vi.fn(),
}));

import { useUser } from '@/features/users/hooks/use-user';

import { useSelfActionGate } from '../useSelfActionGate';

function mockUser(userId: string | null) {
vi.mocked(useUser).mockReturnValue({
user: userId ? { userId } : null,
isLoading: false,
isDegraded: false,
error: null,
refresh: vi.fn(),
  } as unknown as ReturnType<typeof useUser>);
}

describe('useSelfActionGate', () => {
it('reports isSelfAction === true when target is the current user', () => {
mockUser('user-42');
const { result } = renderHook(() => useSelfActionGate());
expect(result.current.isSelfAction('user-42')).toBe(true);
expect(result.current.gate('user-42', () => 'ok')).toBeNull();
  });

it('reports isSelfAction === false and gates through when target is another user', () => {
mockUser('user-42');
const { result } = renderHook(() => useSelfActionGate());
expect(result.current.isSelfAction('user-99')).toBe(false);
expect(result.current.gate('user-99', () => 'value')).toBe('value');
  });

it('suppresses self-action when useUser is hydrating (no user yet)', () => {
mockUser(null);
const { result } = renderHook(() => useSelfActionGate());
expect(result.current.isSelfAction('user-99')).toBe(false);
expect(result.current.gate('user-99', () => 'should-not-run')).toBeNull();
  });
});
