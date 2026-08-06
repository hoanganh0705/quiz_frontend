/**
 * `__tests__/CategoryRestoreDialog.spec.tsx`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.E4.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DeletedCategoryListItem } from '../../category-types';
import { CategoryRestoreDialog } from '../CategoryRestoreDialog';

// ─── Mock hooks ─────────────────────────────────────────────────────────────

const CATEGORY: DeletedCategoryListItem = {
  categoryId: 'cat-1',
  name: 'Mathematics',
  slug: 'mathematics',
  description: null,
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: '2026-01-15T12:00:00.000Z',
};

const mockRestore = vi.hoisted(() => vi.fn());

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

vi.mock('../hooks/useRestoreCategory', () => ({
  useRestoreCategory: () => ({
    restore: mockRestore,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CategoryRestoreDialog', () => {
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
      <CategoryRestoreDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onRestored={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: /Restore category/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/It will appear in the active list again/),
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
      <CategoryRestoreDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onRestored={vi.fn()}
      />,
    );
    expect(screen.getByText(/Action not available/)).toBeInTheDocument();
  });

  it('renders nothing when category is null', () => {
    const { container } = render(
      <CategoryRestoreDialog
        open={true}
        onOpenChange={vi.fn()}
        category={null}
        onRestored={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: /Restore category/i }),
    ).not.toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  it('renders Cancel and Restore category buttons', () => {
    render(
      <CategoryRestoreDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onRestored={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Restore category/i }),
    ).toBeInTheDocument();
  });

  it('hides Restore category when permission is denied', () => {
    mockUsePermission.mockReturnValue({
      hasPermission: false,
      isLoading: false,
      error: null,
    });
    render(
      <CategoryRestoreDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onRestored={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /Restore category/i }),
    ).not.toBeInTheDocument();
  });
});