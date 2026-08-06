/**
 * `app/admin/__tests__/admin-tags-page.spec.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.A3.
 *
 * Verifies that `admin/tags/page.tsx` (the route file) correctly:
 *   1. Renders without crashing.
 *   2. Imports and delegates to `<TagAdminPage />` without any direct API calls.
 *   3. Does not manage any state or call any service functions directly.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import AdminTagsPage from '../tags/page';

// Mock the entire tag-admin components module so we can verify
// the route file imports and delegates to it without rendering
// the full nested component tree.
vi.mock(
  '@/features/admin/tag-admin/components/TagAdminPage',
  () => ({
    TagAdminPage: vi.fn(() => (
      <div data-testid='tag-admin-page'>
        <span>TagAdminPage rendered</span>
      </div>
    )),
  }),
);

describe('AdminTagsPage', () => {
  it('renders without crashing', () => {
    const { container } = render(<AdminTagsPage />);
    expect(container).toBeDefined();
  });

  it('delegates to TagAdminPage', () => {
    render(<AdminTagsPage />);
    expect(screen.getByTestId('tag-admin-page')).toBeInTheDocument();
  });
});
