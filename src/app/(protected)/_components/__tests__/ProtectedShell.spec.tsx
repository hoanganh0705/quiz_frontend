'use client';

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/features/users/store/user-store', () => ({
  useUser: vi.fn(),
  useIsUserLoading: vi.fn(),
}));

vi.mock('@/features/auth/utils/auth-cookies', () => ({
  getAuthToken: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

import { useUser, useIsUserLoading } from '@/features/users/store/user-store';
import { getAuthToken } from '@/features/auth/utils/auth-cookies';
import { useRouter } from 'next/navigation';
import { ProtectedShell } from '@/app/(protected)/_components/ProtectedShell';

const mockedUseUser = vi.mocked(useUser);
const mockedUseIsUserLoading = vi.mocked(useIsUserLoading);
const mockedGetAuthToken = vi.mocked(getAuthToken);
const mockedUseRouter = vi.mocked(useRouter);

describe('ProtectedShell integration', () => {
  it('renders the checking-state skeleton while the user is loading', () => {
    mockedUseUser.mockReturnValue(null);
    mockedUseIsUserLoading.mockReturnValue(true);
    mockedGetAuthToken.mockReturnValue('token-123');

    render(
      <ProtectedShell>
        <div data-testid='protected-child'>child</div>
      </ProtectedShell>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/checking/i);
    expect(screen.queryByTestId('protected-child')).toBeNull();
  });

  it('renders children when the user is loaded', () => {
    mockedUseUser.mockReturnValue({
      userId: 'u-1',
      username: 'alice',
      email: 'a@example.com',
      xpTotal: 0,
      currentStreak: 0,
      longestStreak: 0,
      settings: {
        emailNotifications: true,
        pushNotifications: true,
        leaderboardVisible: true,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as never);
    mockedUseIsUserLoading.mockReturnValue(false);
    mockedGetAuthToken.mockReturnValue('token-123');

    render(
      <ProtectedShell>
        <div data-testid='protected-child'>child</div>
      </ProtectedShell>,
    );

    expect(screen.getByTestId('protected-child')).toHaveTextContent('child');
    expect(screen.getByTestId('protected-shell')).toBeInTheDocument();
  });

  it('redirects to /login when no user and no token are present', async () => {
    const replace = vi.fn();
    mockedUseRouter.mockReturnValue({
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      push: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as never);
    mockedUseUser.mockReturnValue(null);
    mockedUseIsUserLoading.mockReturnValue(false);
    mockedGetAuthToken.mockReturnValue(null);

    render(
      <ProtectedShell>
        <div data-testid='protected-child'>child</div>
      </ProtectedShell>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        expect.stringMatching(/^\/login\?redirect=/),
      );
    });
    expect(screen.queryByTestId('protected-child')).toBeNull();
  });

  it('does not redirect when a token is present even if the user is still null', () => {
    const replace = vi.fn();
    mockedUseRouter.mockReturnValue({
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      push: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as never);
    mockedUseUser.mockReturnValue(null);
    mockedUseIsUserLoading.mockReturnValue(true);
    mockedGetAuthToken.mockReturnValue('token-123');

    render(
      <ProtectedShell>
        <div data-testid='protected-child'>child</div>
      </ProtectedShell>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
