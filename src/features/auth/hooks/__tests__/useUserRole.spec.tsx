
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import type { CurrentUserResponseDto } from '@/lib/api';

vi.mock('@/features/auth/utils/auth-cookies', () => ({
  getAuthToken: vi.fn(),
}));

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    getAuth: () => ({
      authControllerGetCurrentUser: mockGetCurrentUser,
    }),
  };
});

import { getAuthToken } from '@/features/auth/utils/auth-cookies';
import { useUserRole } from '../useUserRole';

const render = () =>
  renderHook(() => useUserRole(), {
    wrapper: ({ children }) => (
      <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    ),
  });

describe('useUserRole', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockReset();
  });

  it('returns null role and isLoading=false when no auth token is present', async () => {
    vi.mocked(getAuthToken).mockReturnValue(null);

    const { result } = render();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.role).toBeNull();
    expect(result.current.isVerified).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('returns role and isVerified when /auth/me succeeds', async () => {
    vi.mocked(getAuthToken).mockReturnValue('token');
    const payload: CurrentUserResponseDto = {
      userId: 'u-1',
      username: 'alice',
      email: 'alice@example.test',
      role: 'admin',
      isVerified: true,
    };
    mockGetCurrentUser.mockResolvedValue({ data: payload });

    const { result } = render();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.role).toBe('admin');
    expect(result.current.isVerified).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('surfaces null when the response payload has no data', async () => {
    vi.mocked(getAuthToken).mockReturnValue('token');
    mockGetCurrentUser.mockResolvedValue({ data: undefined });

    const { result } = render();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.role).toBeNull();
    expect(result.current.isVerified).toBe(false);
  });
});
