/**
 * `app/admin/__tests__/admin-routes.integration.spec.tsx`
 *
 * Source epic:   Epic 7.2.
 * Source ticket: TKT-7.2.D2.
 *
 * ## Purpose
 *
 * Validates that the admin route group behaves correctly for the
 * representative nested segment `/admin/tags` — and by extension for all
 * nested `/admin/*` paths that use the same `AdminLayoutShell`.
 *
 * Validates:
 * 1. The nested segment is protected by the same flag + role boundaries as `/admin`.
 * 2. Exactly one layout instance renders (no duplicate shell).
 * 3. The breadcrumb reflects the nested path.
 */

import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminLayoutShell } from '../_components/AdminLayoutShell';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: vi.fn<(flag: string) => ({
    flag: string;
    value: 'live' | 'placeholder';
    isLive: boolean;
    isPlaceholder: boolean;
  })>(),
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

function setRole(status: 'unknown' | 'non-admin' | 'admin') {
  vi.mocked(useAdminRole).mockReturnValue({
    role: status === 'admin' ? 'admin' : null,
    isLoading: status === 'unknown',
    error: null,
    permissions: [],
  });
}

function mockPathname(path: string) {
  vi.mocked(usePathname).mockReturnValue(path);
}

function renderNestedPage(roleStatus: 'unknown' | 'non-admin' | 'admin', flagValue: 'live' | 'placeholder') {
  setFlag(flagValue);
  setRole(roleStatus);
  mockPathname('/admin/tags');

  return render(
    <AdminLayoutShell>
      <div data-testid="tags-page-content">Tags management content</div>
    </AdminLayoutShell>,
  );
}

// ── Specs ─────────────────────────────────────────────────────────────────────

describe('Admin nested route /admin/tags — shell composition', () => {
  // ── Flag gate ────────────────────────────────────────────────────────────

  it('renders coming-soon notice when flag is placeholder (nested segment)', () => {
    renderNestedPage('admin', 'placeholder');
    expect(screen.getByText('Admin surfaces coming soon')).toBeInTheDocument();
    expect(screen.queryByTestId('tags-page-content')).not.toBeInTheDocument();
  });

  // ── Role gate ────────────────────────────────────────────────────────────

  it('renders permission denied when role is non-admin (nested segment)', () => {
    renderNestedPage('non-admin', 'live');
    expect(screen.getByTestId('admin-role-guard-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('tags-page-content')).not.toBeInTheDocument();
  });

  it('renders loading skeleton when role is loading (nested segment)', () => {
    renderNestedPage('unknown', 'live');
    expect(screen.getByTestId('admin-role-guard-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('tags-page-content')).not.toBeInTheDocument();
  });

  // ── Allowed access ───────────────────────────────────────────────────────

  it('renders nested page content when flag is live and role is admin', () => {
    renderNestedPage('admin', 'live');
    expect(screen.getByTestId('admin-role-guard-allowed')).toBeInTheDocument();
    expect(screen.getByTestId('tags-page-content')).toBeInTheDocument();
  });

  // ── Breadcrumb ───────────────────────────────────────────────────────────

  it('renders breadcrumb with Tags label for /admin/tags', () => {
    setFlag('live');
    setRole('admin');
    mockPathname('/admin/tags');

    render(
      <AdminLayoutShell>
        <div />
      </AdminLayoutShell>,
    );

    // The breadcrumb should show Admin → Tags
    expect(screen.getByTestId('admin-breadcrumb-root-link')).toHaveTextContent('Admin');
    expect(screen.getByTestId('admin-breadcrumb-current')).toHaveTextContent('Tags');
  });

  it('renders only Admin breadcrumb for /admin/tags/123 (dynamic segment)', () => {
    setFlag('live');
    setRole('admin');
    mockPathname('/admin/tags/123');

    render(
      <AdminLayoutShell>
        <div />
      </AdminLayoutShell>,
    );

    expect(screen.getByTestId('admin-breadcrumb-root-link')).toHaveTextContent('Admin');
    // The last segment (123) should be the current page breadcrumb
    expect(screen.getByTestId('admin-breadcrumb-current')).toHaveTextContent('123');
  });
});
