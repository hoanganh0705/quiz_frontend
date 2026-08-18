

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TagDto } from '../../tag-types';
import { TagEditDialog } from '../TagEditDialog';

const MOCK_TAG: TagDto = {
tagId: 'tag-1',
name: 'JavaScript',
slug: 'javascript',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
} as TagDto;

let nextResolve: TagDto | null = null;
let nextReject: Error | null = null;
const DEFAULT_TAG = { ...MOCK_TAG };

const mockUpdate = vi.hoisted(() =>
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

vi.mock('../../hooks/useUpdateTag', () => ({
useUpdateTag: () => ({
update: mockUpdate,
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

describe('TagEditDialog', () => {
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

it('renders the dialog when open with a tag', () => {
render(
<TagEditDialog
open={true}
onOpenChange={vi.fn()}
tag={MOCK_TAG}
onUpdated={vi.fn()}
      />,
    );
expect(screen.getByText('Edit Tag')).toBeInTheDocument();
expect(
screen.getByText('Update the name or slug of this tag.'),
    ).toBeInTheDocument();
  });

it('renders PermissionDeniedNotice when permission is denied', () => {
mockUsePermission.mockReturnValue({
hasPermission: false,
isLoading: false,
error: null,
    });
render(
<TagEditDialog
open={true}
onOpenChange={vi.fn()}
tag={MOCK_TAG}
onUpdated={vi.fn()}
      />,
    );
expect(screen.getByText(/Action not available/)).toBeInTheDocument();
  });

it('renders the dialog with pre-filled form fields', () => {
render(
<TagEditDialog
open={true}
onOpenChange={vi.fn()}
tag={MOCK_TAG}
onUpdated={vi.fn()}
      />,
    );

const submit = document.querySelector<HTMLButtonElement>(
'[type="submit"]',
    );
expect(submit).not.toBeDisabled();
  });

it('renders Cancel and Save changes buttons', () => {
render(
<TagEditDialog
open={true}
onOpenChange={vi.fn()}
tag={MOCK_TAG}
onUpdated={vi.fn()}
      />,
    );
expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
expect(
screen.getByRole('button', { name: /Save changes/i }),
    ).toBeInTheDocument();
  });

});
