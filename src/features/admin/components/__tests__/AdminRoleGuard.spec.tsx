

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks/useAdminRole', () => ({
useAdminRole: vi.fn(),
}));

import { useAdminRole } from '../../hooks/useAdminRole';

import { AdminRoleGuard } from '../AdminRoleGuard';

function mockRole(values: {
isLoading?: boolean;
role?: string | null;
}) {
vi.mocked(useAdminRole).mockReturnValue({
isLoading: values.isLoading ?? false,
error: null,
role: values.role ?? null,
permissions: [],
  });
}

describe('AdminRoleGuard', () => {
it('renders the skeleton when status is unknown (isLoading=true)', () => {
mockRole({ isLoading: true });
render(
<AdminRoleGuard>
<div data-testid="child">secret content</div>
</AdminRoleGuard>,
    );
expect(
screen.getByTestId('admin-role-guard-skeleton'),
    ).toBeInTheDocument();
expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

it('renders the supplied fallback when status is unknown', () => {
mockRole({ isLoading: true });
render(
<AdminRoleGuard fallback={<span data-testid="custom-fallback" />}>
<div data-testid="child">secret content</div>
</AdminRoleGuard>,
    );
expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

it('renders PermissionDeniedNotice and never children when role is non-admin', () => {
mockRole({ role: 'moderator' });
render(
<AdminRoleGuard>
<div data-testid="child">secret content</div>
</AdminRoleGuard>,
    );
expect(
screen.getByTestId('admin-role-guard-denied'),
    ).toBeInTheDocument();
expect(
screen.getByText('This page is restricted to administrators.'),
    ).toBeInTheDocument();
expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

it('renders children when role is admin', () => {
mockRole({ role: 'admin' });
render(
<AdminRoleGuard>
<div data-testid="child">secret content</div>
</AdminRoleGuard>,
    );
expect(
screen.getByTestId('admin-role-guard-allowed'),
    ).toBeInTheDocument();
expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
