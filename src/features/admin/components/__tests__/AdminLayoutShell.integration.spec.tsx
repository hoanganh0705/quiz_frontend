

import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminLayoutShell } from '../../../../app/(protected)/admin/_components/AdminLayoutShell';
import type { UseAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import type { AdminRoleDocument } from '@/features/admin/hooks/useAdminRole';

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: vi.fn<(flag: string) => UseAdminFeatureFlag>(),
}));

vi.mock('@/features/admin/hooks/useAdminRole', () => ({
useAdminRole: vi.fn<() => AdminRoleDocument>(),
}));

vi.mock('next/navigation', () => ({
usePathname: vi.fn<() => string>(),
useRouter: vi.fn(() => ({
push: vi.fn(),
replace: vi.fn(),
refresh: vi.fn(),
back: vi.fn(),
forward: vi.fn(),
prefetch: vi.fn(),
  })),
}));

vi.mock('@/features/admin/hooks/useAdminNav', () => ({
useAdminNav: vi.fn(() => ({
isLoading: false,
mainEntries: [
{ href: '/admin', label: 'Dashboard', icon: undefined, requiredPermissions: [] },
    ],
bottomEntries: [
{ href: '/admin/settings', label: 'Settings', icon: undefined, requiredPermissions: [] },
    ],
  })),
}));

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { useAdminRole } from '@/features/admin/hooks/useAdminRole';
import { usePathname } from 'next/navigation';

function setFlag(value: 'live' | 'placeholder') {
vi.mocked(useAdminFeatureFlag).mockReturnValue({
flag: 'admin_live',
value,
isLive: value === 'live',
isPlaceholder: value === 'placeholder',
  });
}

function setRole(status: 'unknown' | 'non-admin' | 'admin') {
vi.mocked(useAdminRole).mockReturnValue({
role: status === 'admin' ? 'admin' : null,
isLoading: status === 'unknown',
error: null,
  });
}

function renderShell() {

vi.mocked(usePathname).mockReturnValue('/admin');

return render(
<AdminLayoutShell>
<div data-testid="shell-content">Dashboard content</div>
</AdminLayoutShell>,
  );
}

describe('AdminLayoutShell — combined flag × role decision matrix', () => {

it('renders coming-soon notice when flag is placeholder (role loading)', () => {
setFlag('placeholder');
setRole('unknown');
renderShell();
expect(screen.getByText('Admin surfaces coming soon')).toBeInTheDocument();
expect(screen.queryByTestId('shell-content')).not.toBeInTheDocument();
  });

it('renders coming-soon notice when flag is placeholder (role admin)', () => {
setFlag('placeholder');
setRole('admin');
renderShell();
expect(screen.getByText('Admin surfaces coming soon')).toBeInTheDocument();
expect(screen.queryByTestId('shell-content')).not.toBeInTheDocument();
  });

it('renders coming-soon notice when flag is placeholder (role non-admin)', () => {
setFlag('placeholder');
setRole('non-admin');
renderShell();
expect(screen.getByText('Admin surfaces coming soon')).toBeInTheDocument();
expect(screen.queryByTestId('shell-content')).not.toBeInTheDocument();
  });

it('renders loading skeleton when flag is live and role is loading', () => {
setFlag('live');
setRole('unknown');
renderShell();
expect(screen.getByTestId('admin-role-guard-skeleton')).toBeInTheDocument();
expect(screen.queryByTestId('shell-content')).not.toBeInTheDocument();
  });

it('renders shell content when flag is live and role is admin', () => {
setFlag('live');
setRole('admin');
renderShell();
expect(screen.getByTestId('admin-role-guard-allowed')).toBeInTheDocument();
expect(screen.getByTestId('shell-content')).toBeInTheDocument();
  });

it('renders permission denied when flag is live and role is non-admin', () => {
setFlag('live');
setRole('non-admin');
renderShell();
expect(screen.getByTestId('admin-role-guard-denied')).toBeInTheDocument();
expect(screen.queryByTestId('shell-content')).not.toBeInTheDocument();
  });
});
