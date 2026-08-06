/**
 * `__tests__/TagDeleteConfirmDialog.spec.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.E3.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import type { TagListItem } from '../../tag-types';
import { TagDeleteConfirmDialog } from '../TagDeleteConfirmDialog';

// ─── Mock hooks ─────────────────────────────────────────────────────────────

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

// ─── Tests ──────────────────────────────────────────────────────────────────

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
    // The description uses curly quotes around the tag name.
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
    // "Delete tag" appears in both title and button.
    expect(screen.getAllByText('Delete tag')).toHaveLength(2);
  });
});
