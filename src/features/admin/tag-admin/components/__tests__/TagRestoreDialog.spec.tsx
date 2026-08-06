/**
 * `__tests__/TagRestoreDialog.spec.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.E4.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import type { TagDto, DeletedTagListItem } from '../../tag-types';
import { TagRestoreDialog } from '../TagRestoreDialog';

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_DELETED_TAG: DeletedTagListItem = {
  tagId: 'tag-deleted',
  name: 'JavaScript',
  slug: 'javascript',
  deletedAt: '2024-06-01T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
} as DeletedTagListItem;

// ─── Mock hooks ─────────────────────────────────────────────────────────────
// All mock factories are hoisted to module top. No cross-references between them.

const mockRestore = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    tagId: 'tag-deleted',
    name: 'JavaScript',
    slug: 'javascript',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  } as TagDto),
);
const mockUsePermission = vi.hoisted(() =>
  vi.fn(() => ({ hasPermission: true, isLoading: false, error: null })),
);

vi.mock('@/features/admin/hooks', () => ({
  usePermission: (..._args: unknown[]) => mockUsePermission(..._args),
}));

vi.mock('../../hooks/useRestoreTag', () => ({
  useRestoreTag: () => ({
    restore: mockRestore,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TagRestoreDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      isLoading: false,
      error: null,
    });
  });

  function renderDialog(
    props: {
      open?: boolean;
      tag?: DeletedTagListItem | null;
      onOpenChange?: ReturnType<typeof vi.fn>;
      onRestored?: (tag: TagDto) => void;
    } = {},
  ) {
    return render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <TagRestoreDialog
          open={props.open ?? true}
          onOpenChange={props.onOpenChange ?? vi.fn()}
          tag={props.tag ?? MOCK_DELETED_TAG}
          onRestored={props.onRestored ?? vi.fn()}
        />
      </SWRConfig>,
    );
  }

  it('renders the restore copy', () => {
    renderDialog();
    expect(screen.getByText(/active list/i)).toBeInTheDocument();
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

  it('renders Cancel and Restore tag buttons', () => {
    renderDialog();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    // "Restore tag" appears in both title and button; use role to target the button.
    expect(
      screen.getByRole('button', { name: /Restore tag/i }),
    ).toBeInTheDocument();
  });
});
