'use client';

import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/features/users/store/user-store', () => {
  const state = { error: null };
  return {
    useUser: vi.fn(),
    useIsUserLoading: vi.fn(),
    useUserError: vi.fn(),
    useUserStore: Object.assign(vi.fn(() => state), {
      getState: vi.fn(() => state),
      setState: vi.fn(),
      subscribe: vi.fn(),
    }),
  };
});

vi.mock('@/features/auth/hooks/use-auth-state', () => ({
  useAuthState: vi.fn(),
}));

import {
  useUser,
  useIsUserLoading,
  useUserError,
} from '@/features/users/store/user-store';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';

const mockedUseUser = vi.mocked(useUser);
const mockedUseIsUserLoading = vi.mocked(useIsUserLoading);
const mockedUseUserError = vi.mocked(useUserError);
const mockedUseAuthState = vi.mocked(useAuthState);

describe('useAuthSession — surface snapshot', () => {
  it('exposes the canonical session shape when authenticated', () => {
    const viewer = { userId: 'u-1', username: 'alice' };
    mockedUseAuthState.mockReturnValue({
      isAuthenticated: true,
      setAuthenticated: () => undefined,
    });
    mockedUseUser.mockReturnValue(viewer as never);
    mockedUseIsUserLoading.mockReturnValue(false);
    mockedUseUserError.mockReturnValue(null);

    const { result } = renderHook(() => useAuthSession());

    expect(result.current).toEqual({
      isAuthenticated: true,
      isBootstrapping: false,
      isDegraded: false,
      bootstrapState: 'authenticated',
      currentUserId: 'u-1',
      user: viewer,
      currentUser: viewer,
    });
  });

  it('reports unauthenticated when the auth cookie is absent', () => {
    mockedUseAuthState.mockReturnValue({
      isAuthenticated: false,
      setAuthenticated: () => undefined,
    });
    mockedUseUser.mockReturnValue(null);
    mockedUseIsUserLoading.mockReturnValue(false);
    mockedUseUserError.mockReturnValue(null);

    const { result } = renderHook(() => useAuthSession());

    expect(result.current.bootstrapState).toBe('unauthenticated');
    expect(result.current.currentUserId).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('reports bootstrapping when authenticated but the user is still loading', () => {
    mockedUseAuthState.mockReturnValue({
      isAuthenticated: true,
      setAuthenticated: () => undefined,
    });
    mockedUseUser.mockReturnValue(null);
    mockedUseIsUserLoading.mockReturnValue(true);
    mockedUseUserError.mockReturnValue(null);

    const { result } = renderHook(() => useAuthSession());

    expect(result.current.bootstrapState).toBe('bootstrapping');
    expect(result.current.isBootstrapping).toBe(true);
  });
});
