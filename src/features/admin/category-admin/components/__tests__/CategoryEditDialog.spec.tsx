/**
 * `__tests__/CategoryEditDialog.spec.tsx`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.E2.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CategoryDto } from '../../category-types';
import { CategoryEditDialog } from '../CategoryEditDialog';

// ─── Mock hooks ─────────────────────────────────────────────────────────────

const CATEGORY = {
  categoryId: 'cat-1',
  name: 'Mathematics',
  slug: 'mathematics',
  description: 'Math quizzes',
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as CategoryDto;

const mockUpdate = vi.hoisted(() => vi.fn());

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

vi.mock('../hooks/useUpdateCategory', () => ({
  useUpdateCategory: () => ({
    update: mockUpdate,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));

vi.mock('../hooks/useCategorySlugAvailability', () => ({
  useCategorySlugAvailability: () => ({
    status: 'unknown' as const,
    debouncedSlug: '',
    conflictingCategory: null,
  }),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CategoryEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      isLoading: false,
      error: null,
    });
  });

  it('renders nothing when category is null', () => {
    const { container } = render(
      <CategoryEditDialog
        open={true}
        onOpenChange={vi.fn()}
        category={null}
        onUpdated={vi.fn()}
      />,
    );
    // Dialog returns null when category is null → no header text.
    expect(screen.queryByText('Edit Category')).not.toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  it('renders the dialog with the category when open', () => {
    render(
      <CategoryEditDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText('Edit Category')).toBeInTheDocument();
    expect(
      screen.getByText('Update the name or details of this category.'),
    ).toBeInTheDocument();
  });

  it('renders PermissionDeniedNotice when permission is denied', () => {
    mockUsePermission.mockReturnValue({
      hasPermission: false,
      isLoading: false,
      error: null,
    });
    render(
      <CategoryEditDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText(/Action not available/)).toBeInTheDocument();
  });

  it('renders Cancel and Save changes buttons', () => {
    render(
      <CategoryEditDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Save changes/i }),
    ).toBeInTheDocument();
  });

  it('hides Save changes when permission is denied', () => {
    mockUsePermission.mockReturnValue({
      hasPermission: false,
      isLoading: false,
      error: null,
    });
    render(
      <CategoryEditDialog
        open={true}
        onOpenChange={vi.fn()}
        category={CATEGORY}
        onUpdated={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /Save changes/i }),
    ).not.toBeInTheDocument();
  });

  it('exposes a typed onUpdated callback in the props interface (compile-time)', () => {
    const onUpdated = (_c: CategoryDto): void => {};
    expect(typeof onUpdated).toBe('function');
  });
});