

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminLayoutShell } from '../../../app/(protected)/admin/_components/AdminLayoutShell';

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: vi.fn<(flag: string) => {
flag: string;
value: 'live' | 'placeholder';
isLive: boolean;
isPlaceholder: boolean;
  }>(),
}));

vi.mock('@/features/admin/hooks/useAdminRole', () => ({
useAdminRole: vi.fn<() => {
role: 'admin' | null;
isLoading: boolean;
error: Error | null;
permissions: string[];
  }>(),
}));

vi.mock('@/features/admin/hooks/useAdminNav', () => ({
useAdminNav: vi.fn(() => ({
isLoading: false,
mainEntries: [
{ href: '/admin', label: 'Dashboard', icon: undefined, requiredPermissions: [] },
{ href: '/admin/tags', label: 'Tags', icon: undefined, requiredPermissions: ['tag_create'] },
    ],
bottomEntries: [
{ href: '/admin/settings', label: 'Settings', icon: undefined, requiredPermissions: [] },
    ],
  })),
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

function setRole(role: 'admin' | 'non-admin' | 'unknown') {
vi.mocked(useAdminRole).mockReturnValue({
role: role === 'admin' ? 'admin' : null,
isLoading: role === 'unknown',
error: null,
permissions: role === 'admin'
? ['tag_create', 'category_create', 'user_grant_role']
: [],
  });
}

function mockPathname(path: string) {
vi.mocked(usePathname).mockReturnValue(path);
}

function renderShell() {
return render(
<AdminLayoutShell>
<div data-testid="shell-content">Admin content</div>
</AdminLayoutShell>,
  );
}

describe('Epic 7.2 — TKT-7.2.E2 shell integration coverage', () => {

it('renders shell, permitted nav, and breadcrumb when admin and flag is live', () => {
setFlag('live');
setRole('admin');
mockPathname('/admin');

renderShell();

expect(screen.getByTestId('admin-role-guard-allowed')).toBeInTheDocument();

expect(screen.getByTestId('admin-breadcrumb')).toBeInTheDocument();
expect(screen.getByTestId('admin-breadcrumb-root-link')).toHaveTextContent('Admin');

expect(screen.getByTestId('admin-nav-item--admin')).toBeInTheDocument();
expect(screen.getByTestId('admin-nav-item--admin-tags')).toBeInTheDocument();

expect(screen.queryByTestId('admin-nav-item--admin-categories')).not.toBeInTheDocument();
  });

it('renders permission denied notice when non-admin (no shell, no nav)', () => {
setFlag('live');
setRole('non-admin');
mockPathname('/admin');

renderShell();

expect(screen.queryByTestId('shell-content')).not.toBeInTheDocument();
expect(screen.getByTestId('admin-role-guard-denied')).toBeInTheDocument();
  });

it('renders one loading skeleton when role is loading (no flicker)', () => {
setFlag('live');
setRole('unknown');
mockPathname('/admin');

renderShell();

expect(screen.getByTestId('admin-role-guard-skeleton')).toBeInTheDocument();
expect(screen.queryByTestId('shell-content')).not.toBeInTheDocument();

expect(
screen.queryAllByTestId('admin-role-guard-skeleton'),
    ).toHaveLength(1);
  });

it('renders correct breadcrumb for /admin (landing)', () => {
setFlag('live');
setRole('admin');
mockPathname('/admin');

renderShell();

expect(screen.getByTestId('admin-breadcrumb-root-link')).toHaveTextContent('Admin');
expect(screen.queryByTestId('admin-breadcrumb-current')).not.toBeInTheDocument();
  });

it('renders correct breadcrumb for /admin/tags (nested)', () => {
setFlag('live');
setRole('admin');
mockPathname('/admin/tags');

renderShell();

expect(screen.getByTestId('admin-breadcrumb-root-link')).toHaveTextContent('Admin');
expect(screen.getByTestId('admin-breadcrumb-current')).toHaveTextContent('Tags');
  });

it('renders raw segment text for unknown route without crashing', () => {
setFlag('live');
setRole('admin');
mockPathname('/admin/xyz-unknown-page');

renderShell();

expect(screen.getByTestId('admin-breadcrumb-current')).toHaveTextContent('xyz-unknown-page');

expect(screen.getByTestId('shell-content')).toBeInTheDocument();
  });

it('renders coming-soon notice when flag is placeholder (no crash, no shell)', () => {
setFlag('placeholder');
setRole('admin');
mockPathname('/admin');

renderShell();

expect(screen.getByText('Admin surfaces coming soon')).toBeInTheDocument();
expect(screen.queryByTestId('shell-content')).not.toBeInTheDocument();
  });

it('does not render coming-soon for non-admin when flag is placeholder (denied takes precedence)', () => {
setFlag('placeholder');
setRole('non-admin');
mockPathname('/admin');

renderShell();

expect(screen.getByText('Admin surfaces coming soon')).toBeInTheDocument();
  });

it('renders shell without calling admin resource endpoints (no API fetch)', () => {
setFlag('live');
setRole('admin');
mockPathname('/admin');

const fetchSpy = vi.spyOn(globalThis, 'fetch');

renderShell();

const adminResourceCalls = fetchSpy.mock.calls.filter(([url]) => {
const call = typeof url === 'string' ? url : String(url);
return (
call.includes('/api/v1/admin/tags') ||
call.includes('/api/v1/admin/categories') ||
call.includes('/api/v1/admin/users') ||
call.includes('/api/v1/admin/ranking') ||
call.includes('/api/v1/admin/achievements') ||
call.includes('/api/v1/admin/tournaments')
      );
    });

expect(adminResourceCalls).toHaveLength(0);
fetchSpy.mockRestore();
  });
});
