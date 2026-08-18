

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import type { TagListItem } from '../../tag-types';
import { TagDeleteConfirmDialog } from '../TagDeleteConfirmDialog';

const MOCK_TAG: TagListItem = {
tagId: 'tag-1',
name: 'JavaScript',
slug: 'javascript',
deletedAt: null,
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
} as TagListItem;

const mockRemove = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockUsePermission = vi.hoisted(() =>
vi.fn(() => ({ hasPermission: true, isLoading: false, error: null })),
);

vi.mock('@/features/admin/hooks', () => ({
usePermission: (..._args: unknown[]) => mockUsePermission(..._args),
}));

vi.mock('../../hooks/useDeleteTag', () => ({
useDeleteTag: () => ({
remove: mockRemove,
isPending: false,
error: null,
reset: vi.fn(),
audit: { beforeTagId: null, afterTagId: null },
  }),
}));

describe('TagDeleteConfirmDialog', () => {
beforeEach(() => {
vi.clearAllMocks();
mockUsePermission.mockReturnValue({
hasPermission: true,
isLoading: false,
error: null,
    });
mockRemove.mockClear();
mockRemove.mockResolvedValue(undefined);
  });

function renderDialog(props: {
open?: boolean;
tag?: TagListItem | null;
onOpenChange?: ReturnType<typeof vi.fn>;
onDeleted?: ReturnType<typeof vi.fn>;
  } = {}) {
return render(
<SWRConfig value={{ provider: () => new Map() }}>
<TagDeleteConfirmDialog
open={props.open ?? true}
onOpenChange={props.onOpenChange ?? vi.fn()}
tag={props.tag ?? MOCK_TAG}
onDeleted={props.onDeleted ?? vi.fn()}
        />
</SWRConfig>,
    );
  }

it('renders the confirm copy', () => {
renderDialog();
expect(screen.getByText(/Are you sure you want to soft-delete/i)).toBeInTheDocument();

expect(screen.getByText(/JavaScript/)).toBeInTheDocument();
  });

it('renders PermissionDeniedNotice when permission is denied', () => {
mockUsePermission.mockReturnValue({
hasPermission: false,
isLoading: false,
error: null,
    });
renderDialog();
expect(screen.getByText(/Action not available/)).toBeInTheDocument();
  });

it('renders Cancel and confirm buttons', () => {
renderDialog();
expect(screen.getByText('Cancel')).toBeInTheDocument();

expect(screen.getAllByText('Delete tag')).toHaveLength(2);
  });
});
