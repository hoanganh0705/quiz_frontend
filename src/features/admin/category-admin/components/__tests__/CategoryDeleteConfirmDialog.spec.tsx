/**
 * `__tests__/CategoryDeleteConfirmDialog.spec.tsx`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.E3.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CategoryListItem } from '../../category-types';
import { CategoryDeleteConfirmDialog } from '../CategoryDeleteConfirmDialog';

// ─── Mock hooks / services ──────────────────────────────────────────────────

const CATEGORY: CategoryListItem = {
  categoryId: 'cat-1',
  name: 'Mathematics',
  slug: 'mathematics',
  description: null,
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
};

const mockDeleteCategory = vi.hoisted(() => vi.fn(async (_id: string) => CATEGORY.categoryId));

const mockUsePermission = vi.hoisted(() =>
  vi.fn((_perm?: unknown) => ({
    hasPermission: true,
    isLoading: false,
    error: null,
  })),
);

vi.mock('@/features/admin/hooks', () => ({
  usePermission: ((...args: unknown[]) =>
    mockUsePermission(...args)) as never,
}));

vi.mock('@/features/admin/services/category-admin.service', () => ({
  deleteCategory: (id: string) => mockDeleteCategory(id),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CategoryDeleteConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      isLoading: false,
      error: null,
    });
  });

  it('renders the documented confirm copy when open with category', () => {
    render(
      <CategoryDeleteConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onDeleted={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: /Delete category/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to soft-delete/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Mathematics/)).toBeInTheDocument();
  });

  it('renders PermissionDeniedNotice when permission is denied', () => {
    mockUsePermission.mockReturnValue({
      hasPermission: false,
      isLoading: false,
      error: null,
    });
    render(
      <CategoryDeleteConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onDeleted={vi.fn()}
      />,
    );
    expect(screen.getByText(/Action not available/)).toBeInTheDocument();
  });

  it('renders nothing when category is null', () => {
    const { container } = render(
      <CategoryDeleteConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        category={null}
        onDeleted={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: /Delete category/i }),
    ).not.toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  it('renders Cancel and Delete category buttons', () => {
    render(
      <CategoryDeleteConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onDeleted={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Delete category/i }),
    ).toBeInTheDocument();
  });

  it('hides Delete category when permission is denied', () => {
    mockUsePermission.mockReturnValue({
      hasPermission: false,
      isLoading: false,
      error: null,
    });
    render(
      <CategoryDeleteConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onDeleted={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /Delete category/i }),
    ).not.toBeInTheDocument();
  });
});