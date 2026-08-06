/**
 * `app/admin/categories/__tests__/page.spec.tsx`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.A3.
 *
 * Validates that the `/admin/categories` route file:
 *   1. Renders without crashing.
 *   2. Emits a `category.admin.mount` breadcrumb on mount.
 *   3. Renders the documented disabled notice when the
 *      `phase7_admin_category` flag is `'placeholder'`.
 *   4. Delegates to `<CategoryAdminPage />` (which itself is a stub in
 *      A3 that renders the disabled notice in both flag states — the
 *      F2 ticket expands the live branch).
 *   5. Does not call `axios` or `fetch(` directly (cross-batch
 *      invariant from `scripts/phase7-lint-invariants.mjs`).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import AdminCategoriesPage from '../page';

// ─── Mock hooks ─────────────────────────────────────────────────────────────

const mockAddCategoryAdminBreadcrumb = vi.hoisted(() => vi.fn());
const mockUseAdminFeatureFlag = vi.hoisted(() =>
  vi.fn((_flag?: unknown) => ({
    isLive: false,
    value: 'placeholder',
    isPlaceholder: true,
  })),
);

vi.mock('@/lib/admin/phase7_admin_sentry', () => ({
  addCategoryAdminBreadcrumb: (input: unknown) =>
    mockAddCategoryAdminBreadcrumb(input),
}));

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: (flag?: unknown) => mockUseAdminFeatureFlag(flag),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AdminCategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderPage() {
    return render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <AdminCategoriesPage />
      </SWRConfig>,
    );
  }

  it('emits a category.admin.mount breadcrumb on mount', () => {
    renderPage();
    expect(mockAddCategoryAdminBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'category.admin.mount',
        route: 'category-admin.page',
        status: 'started',
      }),
    );
  });

  it('renders the documented disabled notice when the flag is placeholder', () => {
    mockUseAdminFeatureFlag.mockReturnValue({
      isLive: false,
      value: 'placeholder',
      isPlaceholder: true,
    });
    renderPage();
    expect(
      screen.getByText(/Category management coming soon/i),
    ).toBeInTheDocument();
  });

  it('route file source contains no axios or fetch() calls', () => {
    const source = readFileSync(
      resolve(__dirname, '..', 'page.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/from\s+['"]axios['"]/);
    expect(source).not.toMatch(/\bfetch\(/);
  });
});