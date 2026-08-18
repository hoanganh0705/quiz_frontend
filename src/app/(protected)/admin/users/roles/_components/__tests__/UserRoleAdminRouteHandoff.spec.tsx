

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { UserRoleAdminRouteHandoff } from '../UserRoleAdminRouteHandoff';

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: vi.fn(),
}));

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
flag: 'admin_user_role_live',
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
flag: 'admin_user_role_live',
value: 'live',
isLive: true,
isPlaceholder: false,
    });

render(<UserRoleAdminRouteHandoff />);

expect(screen.getByTestId('user-role-admin-page')).toBeInTheDocument();
  });
});
