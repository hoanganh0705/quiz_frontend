

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { CategorySlugConflictNotice } from '../CategorySlugConflictNotice';

const mockSlugConflictNotice = vi.hoisted(() =>
vi.fn((props: Record<string, unknown>) => (
<div data-testid='slug-conflict-notice'>
<span data-testid='mode'>{String(props.mode)}</span>
<span data-testid='renamedSlug'>{String(props.renamedSlug)}</span>
<span data-testid='conflictingName'>
{String(props.conflictingTagName ?? '')}
</span>
</div>
  )),
);

vi.mock('@/features/admin/tag-admin/components/SlugConflictNotice', () => ({
SlugConflictNotice: (props: Record<string, unknown>) =>
mockSlugConflictNotice(props),
}));

function makeSlugConflict(requestId?: string): ApiError {
return new ApiError({
isAxiosError: true,
response: {
status: 409,
data: {
extensions: {
code: 'CATEGORY_SLUG_CONFLICT',
conflictingCategoryId: 'cat-other',
...(requestId ? { requestId } : {}),
        },
      },
    },
  } as never);
}

describe('CategorySlugConflictNotice', () => {
it('forwards mode, renamedSlug, and conflictingCategoryName to SlugConflictNotice', () => {
const error = makeSlugConflict();

render(
<CategorySlugConflictNotice
error={error}
mode='create'
renamedSlug='new-slug'
onRenamedSlugChange={vi.fn()}
conflictingCategoryName='Mathematics'
      />,
    );

expect(screen.getByTestId('mode')).toHaveTextContent('create');
expect(screen.getByTestId('renamedSlug')).toHaveTextContent('new-slug');
expect(screen.getByTestId('conflictingName')).toHaveTextContent(
'Mathematics',
    );
  });

it('renders the conflicting category id from extensions', () => {
const error = makeSlugConflict();

render(
<CategorySlugConflictNotice
error={error}
mode='restore'
renamedSlug='math-alt'
onRenamedSlugChange={vi.fn()}
      />,
    );

expect(screen.getByText(/cat-other/)).toBeInTheDocument();
  });

it('renders the request id when present', () => {
const error = makeSlugConflict('req-abc-123');

render(
<CategorySlugConflictNotice
error={error}
mode='create'
renamedSlug='new-slug'
onRenamedSlugChange={vi.fn()}
      />,
    );

expect(screen.getByText(/req-abc-123/)).toBeInTheDocument();
  });

it('does not crash when conflictingCategoryId is absent', () => {
const error = new ApiError({
isAxiosError: true,
response: {
status: 409,
data: { extensions: { code: 'CATEGORY_SLUG_CONFLICT' } },
      },
    } as never);

render(
<CategorySlugConflictNotice
error={error}
mode='create'
renamedSlug='new-slug'
onRenamedSlugChange={vi.fn()}
      />,
    );

expect(screen.queryByText(/Conflicting category ID/)).not.toBeInTheDocument();
  });
});