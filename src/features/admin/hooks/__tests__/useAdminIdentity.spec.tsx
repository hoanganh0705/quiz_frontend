/**
 * `features/admin/hooks/__tests__/useAdminIdentity.spec.ts`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.D3.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: vi.fn(),
}));

import { useAuth } from '@/features/auth/hooks/use-auth';

import { useAdminFeatureFlag } from '../useAdminFeatureFlag';
import { useAdminIdentity } from '../useAdminIdentity';

function mockAuth(currentUser: { userId: string; role?: string } | null) {
  vi.mocked(useAuth).mockReturnValue({
    currentUser,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

function mockFlag(isLive: boolean) {
  vi.mocked(useAdminFeatureFlag).mockReturnValue({
    flag: 'phase7_admin',
    value: isLive ? 'live' : 'placeholder',
    isLive,
    isPlaceholder: !isLive,
  });
}

describe('useAdminIdentity', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('short-circuits to role: "admin" when the slim payload already has role === "admin"', () => {
    mockAuth({ userId: 'u-1', role: 'admin' });
    mockFlag(false);

    const { result } = renderHook(() => useAdminIdentity());
    expect(result.current).toEqual({
      role: 'admin',
      isLoading: false,
      error: null,
    });
  });

  it('triggers a fetch when the slim payload is missing role and the feature flag is live', async () => {
    mockAuth({ userId: 'u-1' });
    mockFlag(true);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ role: 'admin' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminIdentity());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.role).toBe('admin');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns role: null when the fetch fails (no retry)', async () => {
    mockAuth({ userId: 'u-1' });
    mockFlag(true);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminIdentity());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.role).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when the feature flag is placeholder', () => {
    mockAuth({ userId: 'u-1' });
    mockFlag(false);

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminIdentity());
    expect(result.current.role).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
