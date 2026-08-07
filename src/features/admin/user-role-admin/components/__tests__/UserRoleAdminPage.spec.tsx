/**
 * `UserRoleAdminPage` unit tests.
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.F1.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: vi.fn(),
}));

vi.mock('@/features/admin/hooks/usePermission', () => ({
  usePermission: vi.fn(),
}));

vi.mock('../UserRoleSearchPanel', () => ({
  UserRoleSearchPanel: ({
    onUserSelect,
  }: {
    onUserSelect: (user: { userId: string; username: string; email: string; avatar: null; currentRoles: never[] }) => void;
  }) => (
    <div data-testid="user-role-search-panel">
      <button
        data-testid="select-user-button"
        onClick={() =>
          onUserSelect({
            userId: 'target-id',
            username: 'targetUser',
            email: 'target@example.com',
            avatar: null,
            currentRoles: [],
          })
        }
      >
        select
      </button>
    </div>
  ),
}));

vi.mock('../UserRoleCard', () => ({
  UserRoleCard: ({
    user,
    onChanged,
  }: {
    user: { username: string };
    onChanged?: () => void;
  }) => (
    <div data-testid="user-role-card">
      <p>{user.username}</p>
      {onChanged && (
        <button data-testid="trigger-change" onClick={() => onChanged()}>
          trigger
        </button>
      )}
    </div>
  ),
}));

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { usePermission } from '@/features/admin/hooks/usePermission';
import { UserRoleAdminPage } from '../UserRoleAdminPage';

const mockedUseAdminFeatureFlag = vi.mocked(useAdminFeatureFlag);
const mockedUsePermission = vi.mocked(usePermission);

describe('UserRoleAdminPage', () => {
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

  it('renders disabled notice when flag is placeholder', () => {
    mockedUseAdminFeatureFlag.mockReturnValue({
      flag: 'phase7_admin_user_role',
      value: 'placeholder',
      isLive: false,
      isPlaceholder: true,
    });

    render(<UserRoleAdminPage />);

    expect(
      screen.getByTestId('user-role-admin-disabled-notice'),
    ).toBeInTheDocument();
  });

  it('renders search panel and empty state when no user selected', () => {
    mockedUseAdminFeatureFlag.mockReturnValue({
      flag: 'phase7_admin_user_role',
      value: 'live',
      isLive: true,
      isPlaceholder: false,
    });

    render(<UserRoleAdminPage />);

    expect(screen.getByTestId('user-role-search-panel')).toBeInTheDocument();
    expect(screen.getByTestId('user-role-admin-empty-state')).toBeInTheDocument();
  });

  it('renders the user role card when a user is selected', async () => {
    mockedUseAdminFeatureFlag.mockReturnValue({
      flag: 'phase7_admin_user_role',
      value: 'live',
      isLive: true,
      isPlaceholder: false,
    });

    render(<UserRoleAdminPage />);

    fireEvent.click(screen.getByTestId('select-user-button'));

    await waitFor(() => {
      expect(screen.getByTestId('user-role-card')).toBeInTheDocument();
      expect(screen.queryByTestId('user-role-admin-empty-state')).not.toBeInTheDocument();
    });
  });

  it('renders success banner after onChanged callback', async () => {
    mockedUseAdminFeatureFlag.mockReturnValue({
      flag: 'phase7_admin_user_role',
      value: 'live',
      isLive: true,
      isPlaceholder: false,
    });

    render(<UserRoleAdminPage />);

    fireEvent.click(screen.getByTestId('select-user-button'));

    await waitFor(() => {
      expect(screen.getByTestId('user-role-card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('trigger-change'));

    await waitFor(() => {
      expect(
        screen.getByTestId('user-role-admin-success-banner'),
      ).toBeInTheDocument();
    });
  });

  it('renders permission denied notice when canGrant is false', () => {
    mockedUseAdminFeatureFlag.mockReturnValue({
      flag: 'phase7_admin_user_role',
      value: 'live',
      isLive: true,
      isPlaceholder: false,
    });
    mockedUsePermission.mockReturnValue({
      hasPermission: false,
      isLoading: false,
      error: null,
    });

    render(<UserRoleAdminPage />);

    expect(
      screen.getByTestId('user-role-admin-permission-denied'),
    ).toBeInTheDocument();
  });
});
