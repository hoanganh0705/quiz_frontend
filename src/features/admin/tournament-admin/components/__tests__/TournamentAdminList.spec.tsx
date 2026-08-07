/**
 * `TournamentAdminList.spec.tsx`
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.E2.
 *
 * ## Test strategy
 *
 * We use the "Props for Testability" pattern exposed by TournamentAdminList.
 * Instead of deep module mocking, we inject:
 *   - `useList` — a mocked hook returning controlled state
 *   - `ItemComponent`, `EmptyComponent`, `ErrorComponent`, `SkeletonComponent` — simple mock components
 *
 * The dialog components are NOT mocked because vi.mock has complex hoisting behavior.
 * Dialog interactions are covered by integration tests.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TournamentAdminList } from '../TournamentAdminList';

// ─── Mock child components (injected via props) ────────────────────────────────

const MockItemComponent = vi.fn(({
  tournament,
  onEdit,
  onDelete,
}: {
  tournament: { tournamentId: string; title: string };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) => (
  <div data-testid="admin-item-mock" data-id={tournament.tournamentId}>
    <span>{tournament.title}</span>
    <button
      data-testid={`admin-item-edit-${tournament.tournamentId}`}
      onClick={() => onEdit(tournament.tournamentId)}
    >
      Edit
    </button>
    <button
      data-testid={`admin-item-delete-${tournament.tournamentId}`}
      onClick={() => onDelete(tournament.tournamentId)}
    >
      Delete
    </button>
  </div>
));

const MockEmptyComponent = vi.fn(() => (
  <div data-testid="admin-empty-state-mock">No items</div>
));

const MockErrorComponent = vi.fn(({
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) => (
  <div data-testid="admin-error-state-mock">
    Error
    <button data-testid="error-state-retry" onClick={onRetry}>
      Retry
    </button>
  </div>
));

const MockSkeletonComponent = vi.fn(() => (
  <div data-testid="admin-skeleton-mock">Loading...</div>
));

// ─── Mock design-system primitives ─────────────────────────────────────────────

// Helper to find and call onValueChange from a mock Select
const selectCallbacks = new Map<string, (value: string) => void>();

vi.mock('@/components/ui/Select', () => ({
  Select: ({
    children,
    onValueChange,
    value,
    ...props
  }: {
    children?: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
    [key: string]: unknown;
  }) => {
    // Register the callback for this render
    const id = Math.random().toString(36);
    if (onValueChange) {
      selectCallbacks.set(id, onValueChange);
    }
    return (
      <div
        data-testid="mock-select"
        data-select-id={id}
        data-value={value}
        {...props}
      >
        {children}
      </div>
    );
  },
  SelectContent: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="mock-select-content" role="listbox" {...props}>
      {children}
    </div>
  ),
  SelectItem: ({
    children,
    value,
    onSelect,
    ...props
  }: {
    children?: React.ReactNode;
    value: string;
    onSelect?: () => void;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      data-testid={`mock-select-item-${value}`}
      data-value={value}
      role="option"
      onClick={() => {
        // Find the parent Select's callback
        const selectEl = document.querySelector('[data-select-id]');
        const selectId = selectEl?.getAttribute('data-select-id');
        const callback = selectId ? selectCallbacks.get(selectId) : undefined;
        callback?.(value);
        onSelect?.();
      }}
      {...props}
    >
      {children}
    </button>
  ),
  SelectTrigger: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      data-testid="mock-select-trigger"
      {...props}
    >
      {children}
    </button>
  ),
  SelectValue: ({
    placeholder,
    ...props
  }: {
    placeholder?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid="mock-select-value" {...props}>
      {placeholder ?? ''}
    </span>
  ),
}));

// Mock the real Input component so we don't need to mock the real one
vi.mock('@/components/ui/Input', () => ({
  Input: (props: Record<string, unknown>) => {
    const { 'data-testid': testId, ...rest } = props;
    return <input data-testid={testId ?? 'mock-input'} {...rest} />;
  },
}));

// ─── Mock next/navigation ────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TOURNAMENT_ID = '00000000-0000-4000-8000-000000000001';

const SAMPLE_TOURNAMENTS = [
  {
    tournamentId: TOURNAMENT_ID,
    title: 'Spring Cup',
    status: 'upcoming' as const,
    difficulty: 'medium' as const,
    startAt: '2026-09-01T12:00:00.000Z',
    endAt: '2026-09-02T12:00:00.000Z',
    ownerUserId: 'user-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    tournamentId: '00000000-0000-4000-8000-000000000002',
    title: 'Summer Championship',
    status: 'ongoing' as const,
    difficulty: 'hard' as const,
    startAt: '2026-07-01T12:00:00.000Z',
    endAt: '2026-08-01T12:00:00.000Z',
    ownerUserId: 'user-1',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
];

// Mock state that can be updated in beforeEach
const mockState = {
  items: [] as unknown[],
  isLoading: false,
  isLoadingMore: false,
  error: null as unknown,
  mutate: vi.fn(),
  loadMore: vi.fn(),
  setFilter: vi.fn(),
  filter: { status: undefined as string | undefined, search: '' },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TournamentAdminList', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Reset mock state and mock components before each test.
  beforeEach(() => {
    mockState.items = [];
    mockState.isLoading = false;
    mockState.error = null;
    mockState.mutate = vi.fn();
    mockState.setFilter = vi.fn();

    MockItemComponent.mockClear();
    MockEmptyComponent.mockClear();
    MockErrorComponent.mockClear();
    MockSkeletonComponent.mockClear();
  });

  // Helper to create the mock hook (type cast for testing)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createUseListMock = () => () => ({ ...mockState } as any);

  // Helper to render with all mocks injected
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderList = () =>
    render(
      <TournamentAdminList
        useList={createUseListMock()}
        ItemComponent={MockItemComponent as any}
        EmptyComponent={MockEmptyComponent as any}
        ErrorComponent={MockErrorComponent as any}
        SkeletonComponent={MockSkeletonComponent as any}
      />,
    );

  describe('default render', () => {
    it('renders the filter bar', () => {
      renderList();
      expect(
        screen.getByTestId('tournament-admin-list-filters'),
      ).toBeInTheDocument();
    });

    it('renders the empty state when there are no items', () => {
      mockState.items = [];
      mockState.isLoading = false;
      renderList();
      expect(screen.getByTestId('admin-empty-state-mock')).toBeInTheDocument();
    });

    it('renders items when the hook returns them', () => {
      mockState.items = SAMPLE_TOURNAMENTS;
      mockState.isLoading = false;
      renderList();
      expect(screen.getAllByTestId('admin-item-mock')).toHaveLength(2);
    });

    it('renders the skeleton when isLoading=true', () => {
      mockState.isLoading = true;
      renderList();
      expect(screen.getByTestId('admin-skeleton-mock')).toBeInTheDocument();
    });

    it('renders the error state when error is present', () => {
      mockState.error = { code: 'INTERNAL_SERVER_ERROR' };
      mockState.isLoading = false;
      renderList();
      expect(screen.getByTestId('admin-error-state-mock')).toBeInTheDocument();
    });
  });

  describe('filter updates', () => {
    it('status dropdown calls setFilter with the new status', () => {
      renderList();

      fireEvent.click(screen.getByTestId('tournament-admin-filter-status'));
      fireEvent.click(screen.getByTestId('mock-select-item-upcoming'));

      expect(mockState.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'upcoming' }),
      );
    });

    it('search input calls setFilter with the search term', () => {
      renderList();

      fireEvent.change(screen.getByTestId('tournament-admin-filter-search'), {
        target: { value: 'spring' },
      });

      expect(mockState.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'spring' }),
      );
    });
  });
});
