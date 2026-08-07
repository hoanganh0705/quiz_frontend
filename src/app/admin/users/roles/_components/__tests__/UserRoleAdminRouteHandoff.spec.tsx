/**
 * `app/admin/users/roles/__tests__/UserRoleAdminRouteHandoff.spec.tsx`
 *
 * Source epic:   Epic 7.10 — User Role Grant.
 * Source ticket: TKT-7.10.A3, TKT-7.10.F1.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { UserRoleAdminRouteHandoff } from '../UserRoleAdminRouteHandoff';

// Mock the useAdminFeatureFlag hook
vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: vi.fn(),
}));

// Mock the full page to keep this test focused on the route handoff logic
vi.mock(
  '@/features/admin/user-role-admin/components/UserRoleAdminPage',
  () => ({
    UserRoleAdminPage: () => (
      <div data-testid="user-role-admin-page">UserRoleAdminPage</div>
    ),
  }),
);

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';

const mockedUseAdminFeatureFlag = vi.mocked(useAdminFeatureFlag);

describe('UserRoleAdminRouteHandoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders disabled notice when flag is placeholder', () => {
    mockedUseAdminFeatureFlag.mockReturnValue({
      flag: 'phase7_admin_user_role',
      value: 'placeholder',
      isLive: false,
      isPlaceholder: true,
    });

    render(<UserRoleAdminRouteHandoff />);

    expect(
      screen.getByTestId('user-role-admin-disabled-notice'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/User role admin coming soon/i),
    ).toBeInTheDocument();
  });

  it('renders the full UserRoleAdminPage when flag is live', () => {
    mockedUseAdminFeatureFlag.mockReturnValue({
      flag: 'phase7_admin_user_role',
      value: 'live',
      isLive: true,
      isPlaceholder: false,
    });

    render(<UserRoleAdminRouteHandoff />);

    expect(screen.getByTestId('user-role-admin-page')).toBeInTheDocument();
  });
});
