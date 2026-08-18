

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TagDto } from '../../tag-types';
import { TagCreateDialog } from '../TagCreateDialog';

let nextResolve: TagDto | null = null;
let nextReject: Error | null = null;
const DEFAULT_TAG = {
tagId: 'tag-default',
name: 'Default',
slug: 'default',
} as TagDto;

const mockCreate = vi.hoisted(() =>
vi.fn(async () => {
if (nextReject) {
const err = nextReject;
nextReject = null;
throw err;
    }
return nextResolve ?? DEFAULT_TAG;
  }),
);

const mockUsePermission = vi.hoisted(() =>
vi.fn(() => ({ hasPermission: true, isLoading: false, error: null })),
);

vi.mock('@/features/admin/hooks', () => ({
usePermission: (...args: unknown[]) => mockUsePermission(...args),
}));

vi.mock('../../hooks/useCreateTag', () => ({
useCreateTag: () => ({
create: mockCreate,
isPending: false,
error: null,
reset: vi.fn(),
  }),
}));

vi.mock('../../hooks/useTagSlugAvailability', () => ({
useTagSlugAvailability: () => ({
status: 'unknown' as const,
debouncedSlug: '',
conflictingTag: null,
  }),
}));

function makeApiError(code: string, requestId = 'req-test-123') {
return Object.assign(new Error('mock error'), {
code,
requestId,
detail: 'mock detail',
  });
}

describe('TagCreateDialog', () => {
beforeEach(() => {
vi.clearAllMocks();
mockUsePermission.mockReturnValue({
hasPermission: true,
isLoading: false,
error: null,
    });
nextResolve = null;
nextReject = null;
  });

it('renders the dialog when open', () => {
render(
<TagCreateDialog
open={true}
onOpenChange={vi.fn()}
onCreated={vi.fn()}
      />,
    );
expect(screen.getByText('Create Tag')).toBeInTheDocument();
expect(
screen.getByText('Add a new tag to organise quizzes.'),
    ).toBeInTheDocument();
  });

it('renders PermissionDeniedNotice when permission is denied', () => {
mockUsePermission.mockReturnValue({
hasPermission: false,
isLoading: false,
error: null,
    });
render(
<TagCreateDialog
open={true}
onOpenChange={vi.fn()}
onCreated={vi.fn()}
      />,
    );
expect(screen.getByText(/Action not available/)).toBeInTheDocument();
  });

it('disables submit when name is empty', () => {
render(
<TagCreateDialog
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

it('renders the form fields', () => {
render(
<TagCreateDialog
open={true}
onOpenChange={vi.fn()}
onCreated={vi.fn()}
      />,
    );
expect(screen.getByText(/Slug/i)).toBeInTheDocument();
  });

it('renders Cancel button', () => {
render(
<TagCreateDialog
open={true}
onOpenChange={vi.fn()}
onCreated={vi.fn()}
      />,
    );
expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
