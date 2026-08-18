

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CategoryDto } from '../../category-types';
import { CategoryCreateDialog } from '../CategoryCreateDialog';

const mockCreate = vi.hoisted(() => vi.fn());

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

vi.mock('../hooks/useCreateCategory', () => ({
useCreateCategory: () => ({
create: mockCreate,
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

describe('CategoryCreateDialog', () => {
beforeEach(() => {
vi.clearAllMocks();
mockUsePermission.mockReturnValue({
hasPermission: true,
isLoading: false,
error: null,
    });
  });

it('renders the dialog when open', () => {
render(
<CategoryCreateDialog
open={true}
onOpenChange={vi.fn()}
onCreated={vi.fn()}
      />,
    );
expect(screen.getByText('Create Category')).toBeInTheDocument();
expect(
screen.getByText('Add a new category to organise quizzes by topic.'),
    ).toBeInTheDocument();
  });

it('renders PermissionDeniedNotice when permission is denied', () => {
mockUsePermission.mockReturnValue({
hasPermission: false,
isLoading: false,
error: null,
    });
render(
<CategoryCreateDialog
open={true}
onOpenChange={vi.fn()}
onCreated={vi.fn()}
      />,
    );
expect(screen.getByText(/Action not available/)).toBeInTheDocument();
  });

it('disables submit when name is empty (initial render)', () => {
render(
<CategoryCreateDialog
open={true}
onOpenChange={vi.fn()}
onCreated={vi.fn()}
      />,
    );
const submit = document.querySelector<HTMLButtonElement>(
'[type="submit"]',
    );
expect(submit).toBeDisabled();
  });

it('renders the four documented form fields', () => {
render(
<CategoryCreateDialog
open={true}
onOpenChange={vi.fn()}
onCreated={vi.fn()}
      />,
    );

expect(screen.getByRole('textbox', { name: /^Name/ })).toBeInTheDocument();

expect(screen.getByRole('textbox', { name: /^Slug/ })).toBeInTheDocument();

expect(
screen.getByRole('textbox', { name: /^Description/ }),
    ).toBeInTheDocument();

expect(screen.getByLabelText(/^Image URL/)).toBeInTheDocument();
  });

it('renders the Cancel and Create category buttons', () => {
render(
<CategoryCreateDialog
open={true}
onOpenChange={vi.fn()}
onCreated={vi.fn()}
      />,
    );
expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
expect(
screen.getByRole('button', { name: /Create category/i }),
    ).toBeInTheDocument();
  });

it('renders nothing role-related when permission is denied (PermissionDenied path)', () => {
mockUsePermission.mockReturnValue({
hasPermission: false,
isLoading: false,
error: null,
    });
render(
<CategoryCreateDialog
open={true}
onOpenChange={vi.fn()}
onCreated={vi.fn()}
      />,
    );

expect(
screen.queryByRole('button', { name: /Create category/i }),
    ).not.toBeInTheDocument();
  });

it('exposes a typed onCreated callback in the props interface (compile-time)', () => {

const onCreated = (_c: CategoryDto): void => {};
expect(typeof onCreated).toBe('function');
  });
});