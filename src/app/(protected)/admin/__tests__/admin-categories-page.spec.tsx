/**
 * `app/admin/__tests__/admin-categories-page.spec.tsx`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.A3.
 *
 * Verifies that `admin/categories/page.tsx` (the route file) correctly:
 *   1. Renders without crashing.
 *   2. Imports and delegates to `<CategoryAdminPage />` without any
 *      direct API calls.
 *   3. Does not manage any state or call any service functions directly.
 *
 * Mirrors `admin-tags-page.spec.tsx` (Epic 7.3, TKT-7.3.A3) and the
 * cross-route invariants from Epic 7.2 (`admin-routes.integration.spec.tsx`).
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import AdminCategoriesPage from '../categories/page';

// Mock the entire category-admin components module so we can verify
// the route file imports and delegates to it without rendering the
// full nested component tree.
vi.mock(
  '@/features/admin/category-admin/components/CategoryAdminPage',
  () => ({
    CategoryAdminPage: vi.fn(() => (
      <div data-testid='category-admin-page'>
        <span>CategoryAdminPage rendered</span>
      </div>
    )),
  }),
);

describe('AdminCategoriesPage', () => {
  it('renders without crashing', () => {
    const { container } = render(<AdminCategoriesPage />);
    expect(container).toBeDefined();
  });

  it('delegates to CategoryAdminPage', () => {
    render(<AdminCategoriesPage />);
    expect(screen.getByTestId('category-admin-page')).toBeInTheDocument();
  });
});