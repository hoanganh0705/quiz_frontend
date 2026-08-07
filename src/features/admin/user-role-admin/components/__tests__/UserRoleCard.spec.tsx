/**
 * `UserRoleCard` unit tests.
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.E5.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks/useUserRoles', () => ({
  useUserRoles: vi.fn(),
}));

vi.mock('@/features/admin/hooks/usePermission', () => ({
  usePermission: vi.fn(),
}));

vi.mock('../GrantRoleDialog', () => ({
  GrantRoleDialog: ({
    isOpen,
  }: {
    isOpen: boolean;
  }) =>
    isOpen ? (
      <div data-testid="grant-role-dialog-stub" />
    ) : null,
}));

vi.mock('../RevokeRoleDialog', () => ({
  RevokeRoleDialog: ({
    isOpen,
  }: {
    isOpen: boolean;
  }) =>
    isOpen ? (
      <div data-testid="revoke-role-dialog-stub" />
    ) : null,
}));

import { useUserRoles } from '../../hooks/useUserRoles';
import { usePermission } from '@/features/admin/hooks/usePermission';
import { UserRoleCard } from '../UserRoleCard';
import type { UserSearchResultDto } from '../../user-role-admin-types';

const USER: UserSearchResultDto = {
  userId: '00000000-0000-4000-8000-000000000001',
  username: 'targetUser',
  email: 'target@example.com',
  avatar: null,
  currentRoles: ['user_grant_role'],
};

const mockedUseUserRoles = vi.mocked(useUserRoles);
const mockedUsePermission = vi.mocked(usePermission);

describe('UserRoleCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUsePermission.mockReturnValue({
      hasPermission: true,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders user details', () => {
    mockedUseUserRoles.mockReturnValue({
      roles: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserRoleCard user={USER} />);

    expect(screen.getByTestId('user-role-card-username')).toHaveTextContent('targetUser');
    expect(screen.getByTestId('user-role-card-email')).toHaveTextContent('target@example.com');
  });

  it('renders the empty state when user has no roles', () => {
    mockedUseUserRoles.mockReturnValue({
      roles: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserRoleCard user={USER} />);

    expect(screen.getByTestId('user-role-card-empty')).toBeInTheDocument();
  });

  it('renders the role list with revoke buttons', () => {
    mockedUseUserRoles.mockReturnValue({
      roles: [
        {
          role: 'user_grant_role',
          grantedAt: '2025-01-01T00:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserRoleCard user={USER} />);

    expect(screen.getByTestId('user-role-card-list')).toBeInTheDocument();
    expect(screen.getByTestId('user-role-card-role-row')).toBeInTheDocument();
    expect(screen.getByTestId('user-role-card-revoke-button')).toBeInTheDocument();
  });

  it('hides Grant/Revoke buttons when usePermission returns false', () => {
    mockedUsePermission.mockReturnValue({
      hasPermission: false,
      isLoading: false,
      error: null,
    });
    mockedUseUserRoles.mockReturnValue({
      roles: [
        {
          role: 'user_grant_role',
          grantedAt: '2025-01-01T00:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserRoleCard user={USER} />);

    expect(screen.queryByTestId('user-role-card-grant-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-role-card-revoke-button')).not.toBeInTheDocument();
  });

  it('renders loading skeleton when roles are loading', () => {
    mockedUseUserRoles.mockReturnValue({
      roles: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserRoleCard user={USER} />);

    expect(screen.getByTestId('user-role-card-skeleton')).toBeInTheDocument();
  });

  it('opens the GrantRoleDialog when Grant button clicked', async () => {
    mockedUseUserRoles.mockReturnValue({
      roles: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserRoleCard user={USER} />);

    fireEvent.click(screen.getByTestId('user-role-card-grant-button'));

    await waitFor(() => {
      expect(
        screen.getByTestId('grant-role-dialog-stub'),
      ).toBeInTheDocument();
    });
  });

  it('opens the RevokeRoleDialog when Revoke button clicked', async () => {
    mockedUseUserRoles.mockReturnValue({
      roles: [
        {
          role: 'user_grant_role',
          grantedAt: '2025-01-01T00:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserRoleCard user={USER} />);

    fireEvent.click(screen.getByTestId('user-role-card-revoke-button'));

    await waitFor(() => {
      expect(
        screen.getByTestId('revoke-role-dialog-stub'),
      ).toBeInTheDocument();
    });
  });
});
