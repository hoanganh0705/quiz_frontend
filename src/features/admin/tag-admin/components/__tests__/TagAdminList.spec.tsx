/**
 * `__tests__/TagAdminList.spec.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.F1.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';
import { useSearchParams } from 'next/navigation';

import type { DeletedTagListItem, TagListItem } from '../../tag-types';
import { TagAdminList } from '../TagAdminList';

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_ACTIVE_TAG: TagListItem = {
  tagId: 'tag-active-1',
  name: 'JavaScript',
  slug: 'javascript',
  deletedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
} as TagListItem;

const MOCK_DELETED_TAG: DeletedTagListItem = {
  tagId: 'tag-deleted-1',
  name: 'TypeScript',
  slug: 'typescript',
  deletedAt: '2024-06-01T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
} as DeletedTagListItem;

// ─── Mock hooks ─────────────────────────────────────────────────────────────

const mockUseTagAdminList = vi.hoisted(() =>
  vi.fn(() => ({
    active: [],
    softDeleted: [],
    isLoading: false,
    isValidating: false,
    error: null,
    mutate: vi.fn(),
  })),
);

const mockUsePermission = vi.hoisted(() =>
  vi.fn(() => ({ hasPermission: true, isLoading: false, error: null })),
);

vi.mock('../../hooks/useTagAdminList', () => ({
  useTagAdminList: (...args: unknown[]) => mockUseTagAdminList(...args),
}));

vi.mock('@/features/admin/hooks', () => ({
  usePermission: (..._args: unknown[]) => mockUsePermission(..._args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => (key === 'tab' ? 'active' : null)),
  })),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TagAdminList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      isLoading: false,
      error: null,
    });
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn((key: string) => (key === 'tab' ? 'active' : null)),
    });
  });

  function renderList(props?: { onAddTag?: () => void }) {
    return render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <TagAdminList onAddTag={props?.onAddTag} />
      </SWRConfig>,
    );
  }

  it('renders both tabs', () => {
    renderList();
    expect(screen.getByRole('tab', { name: /Active/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Soft-deleted/i })).toBeInTheDocument();
  });

  it('renders empty active tab state', () => {
    mockUseTagAdminList.mockReturnValue({
      active: [],
      softDeleted: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });
    renderList();
    expect(screen.getByText(/No tags yet/i)).toBeInTheDocument();
  });

  it('renders active tag rows', () => {
    mockUseTagAdminList.mockReturnValue({
      active: [MOCK_ACTIVE_TAG],
      softDeleted: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });
    renderList();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('renders soft-deleted tag rows with deletedAt', () => {
    mockUseTagAdminList.mockReturnValue({
      active: [],
      softDeleted: [MOCK_DELETED_TAG],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn((key: string) => (key === 'tab' ? 'deleted' : null)),
    });
    renderList();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
    // deletedAt formatted date
    expect(screen.getByText(/1 Jun 2024/i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    const apiError = Object.assign(new Error('server error'), {
      code: 'INTERNAL_SERVER_ERROR',
      requestId: 'req-123',
      detail: 'Server error',
    });
    mockUseTagAdminList.mockReturnValue({
      active: [],
      softDeleted: [],
      isLoading: false,
      isValidating: false,
      error: apiError as never,
      mutate: vi.fn(),
    });
    renderList();
    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
  });

  it('hides action buttons when permission is denied', () => {
    mockUsePermission.mockReturnValue({
      hasPermission: false,
      isLoading: false,
      error: null,
    });
    mockUseTagAdminList.mockReturnValue({
      active: [MOCK_ACTIVE_TAG],
      softDeleted: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });
    renderList();
    // Edit and delete buttons should not appear
    const editButtons = screen.queryAllByRole('button', { name: /Edit/i });
    const deleteButtons = screen.queryAllByRole('button', { name: /Delete/i });
    expect(editButtons).toHaveLength(0);
    expect(deleteButtons).toHaveLength(0);
  });
});
