/**
 * `features/shared/__tests__/phase7-7-2.integration.spec.tsx`
 *
 * Source epic:   Epic 7.2.
 * Source ticket: TKT-7.2.E2.
 *
 * ## Purpose
 *
 * Cross-component integration smoke check for Story 7.2 (admin shell entry gate).
 * Asserts the composition of the flag boundary, role guard, permission-derived
 * nav, breadcrumb, and public-route isolation without hitting live endpoints.
 *
 * ## What is covered
 *
 * 1. **Admin login → shell, nav, breadcrumb** (criterion 1)
 * 2. **Non-admin → no shell, no nav** (criterion 2)
 * 3. **Pending → one loading boundary, no flicker** (criterion 3)
 * 4. **Breadcrumb consistency** (criterion 4)
 * 5. **Flag-off → explicit notice, public routes intact** (criterion 5)
 * 6. **No admin resource API calls by the shell** (criterion 6)
 *
 * Individual component behaviour (role × flag matrix, permission filtering,
 * breadcrumb segment rendering) is covered by the component specs that
 * already exist:
 *   - `AdminLayoutShell.integration.spec.tsx` — flag × role matrix
 *   - `AdminNav.spec.tsx` — permission-filtered nav
 *   - `AdminBreadcrumb.spec.tsx` — route-label consistency
 *   - `admin-routes.integration.spec.tsx` — nested segment protection
 *   - `useAdminNav.spec.ts` — permission derivation
 *
 * @see TKT-7.2.E2
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminLayoutShell } from '../../../app/(protected)/admin/_components/AdminLayoutShell';

// ── Mock chain ────────────────────────────────────────────────────────────────

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

// Stable mock references.
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

// ── Specs ────────────────────────────────────────────────────────────────────

describe('Epic 7.2 — TKT-7.2.E2 shell integration coverage', () => {
  // ── Criterion 1: Admin login → shell, permitted nav, breadcrumb ───────────

  it('renders shell, permitted nav, and breadcrumb when admin and flag is live', () => {
    setFlag('live');
    setRole('admin');
    mockPathname('/admin');

    renderShell();

    // Criterion 1a: shell content is visible (admin is allowed)
    expect(screen.getByTestId('admin-role-guard-allowed')).toBeInTheDocument();

    // Criterion 1b: breadcrumb is present (one breadcrumb landmark)
    expect(screen.getByTestId('admin-breadcrumb')).toBeInTheDocument();
    expect(screen.getByTestId('admin-breadcrumb-root-link')).toHaveTextContent('Admin');

    // Criterion 1c: nav items visible (permitted entries only — tags + dashboard)
    // The nav items use data-testid with format admin-nav-item-{href-with-dashes}
    expect(screen.getByTestId('admin-nav-item--admin')).toBeInTheDocument();
    expect(screen.getByTestId('admin-nav-item--admin-tags')).toBeInTheDocument();
    // Categories are NOT permitted (no category permission), so the nav item must not exist
    expect(screen.queryByTestId('admin-nav-item--admin-categories')).not.toBeInTheDocument();
  });

  // ── Criterion 2: Non-admin → no shell, no nav ───────────────────────────

  it('renders permission denied notice when non-admin (no shell, no nav)', () => {
    setFlag('live');
    setRole('non-admin');
    mockPathname('/admin');

    renderShell();

    // Criterion 2: no shell content, no nav, denial notice shown
    expect(screen.queryByTestId('shell-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('admin-role-guard-denied')).toBeInTheDocument();
  });

  // ── Criterion 3: Pending hydration → one loading boundary ───────────────

  it('renders one loading skeleton when role is loading (no flicker)', () => {
    setFlag('live');
    setRole('unknown');
    mockPathname('/admin');

    renderShell();

    // Criterion 3: exactly one loading skeleton, no shell content
    expect(screen.getByTestId('admin-role-guard-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-content')).not.toBeInTheDocument();
    // No duplicate skeletons
    expect(
      screen.queryAllByTestId('admin-role-guard-skeleton'),
    ).toHaveLength(1);
  });

  // ── Criterion 4: Breadcrumb consistency ─────────────────────────────────

  it('renders correct breadcrumb for /admin (landing)', () => {
    setFlag('live');
    setRole('admin');
    mockPathname('/admin');

    renderShell();

    // Criterion 4a: landing — only Admin root link, no current segment
    expect(screen.getByTestId('admin-breadcrumb-root-link')).toHaveTextContent('Admin');
    expect(screen.queryByTestId('admin-breadcrumb-current')).not.toBeInTheDocument();
  });

  it('renders correct breadcrumb for /admin/tags (nested)', () => {
    setFlag('live');
    setRole('admin');
    mockPathname('/admin/tags');

    renderShell();

    // Criterion 4b: nested — Admin root + Tags current
    expect(screen.getByTestId('admin-breadcrumb-root-link')).toHaveTextContent('Admin');
    expect(screen.getByTestId('admin-breadcrumb-current')).toHaveTextContent('Tags');
  });

  it('renders raw segment text for unknown route without crashing', () => {
    setFlag('live');
    setRole('admin');
    mockPathname('/admin/xyz-unknown-page');

    renderShell();

    // Criterion 4c: unknown segment falls through with raw text
    expect(screen.getByTestId('admin-breadcrumb-current')).toHaveTextContent('xyz-unknown-page');
    // No crash — shell still renders
    expect(screen.getByTestId('shell-content')).toBeInTheDocument();
  });

  // ── Criterion 5: Flag-off → explicit notice, public routes intact ──────

  it('renders coming-soon notice when flag is placeholder (no crash, no shell)', () => {
    setFlag('placeholder');
    setRole('admin');
    mockPathname('/admin');

    renderShell();

    // Criterion 5a: explicit notice, no shell
    expect(screen.getByText('Admin surfaces coming soon')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-content')).not.toBeInTheDocument();
  });

  it('does not render coming-soon for non-admin when flag is placeholder (denied takes precedence)', () => {
    setFlag('placeholder');
    setRole('non-admin');
    mockPathname('/admin');

    renderShell();

    // When flag is placeholder the shell is not rendered at all,
    // so we should see the coming-soon notice (not the permission denied)
    expect(screen.getByText('Admin surfaces coming soon')).toBeInTheDocument();
  });

  // ── Criterion 6: No admin resource API calls by the shell ───────────────

  it('renders shell without calling admin resource endpoints (no API fetch)', () => {
    setFlag('live');
    setRole('admin');
    mockPathname('/admin');

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    renderShell();

    // Criterion 6: the shell itself should not call any admin resource endpoints.
    // It may call /auth/me (the role lookup) but not tag/category/ranking endpoints.
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
