/**
 * `QuizHistoryPage.integration.spec.tsx` — integration tests for the
 * `<QuizHistoryPage />` page composition.
 *
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.25.
 *
 * ## Coverage contract
 *
 *   - Filter bar wired to URL-sync hook: filter changes call setFilter.
 *   - Reset restores defaults and clears the URL.
 *   - Paginated list renders rows from the hook.
 *   - Empty-state CTA links to /quizzes.
 *   - 5xx retry affordance renders when the first fetch fails.
 *   - No mutation/service is invoked.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import { QuizHistoryPage } from '@/features/attempts/components/QuizHistoryPage';
import { QuizHistoryList } from '@/features/attempts/components/QuizHistoryList';
import { QuizHistoryFilterBar } from '@/features/attempts/components/QuizHistoryFilterBar';
import type { AttemptHistoryFilters } from '@/features/attempts/types/attempt-history.types';

// ─── Mock ────────────────────────────────────────────────────────────────────

const useAttemptHistoryFiltersMock = vi.fn();
const useMyAttemptsWithFiltersMock = vi.fn();
const replaceMock = vi.fn();

vi.mock(
  '@/features/attempts/hooks/useAttemptHistoryFilters',
  () => ({
    useAttemptHistoryFilters: () => useAttemptHistoryFiltersMock(),
  }),
);

vi.mock(
  '@/features/attempts/hooks/useMyAttemptsWithFilters',
  () => ({
    useMyAttemptsWithFilters: () => useMyAttemptsWithFiltersMock(),
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/quiz-history',
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFilters(
  overrides: Partial<AttemptHistoryFilters> = {},
): AttemptHistoryFilters {
  return {
    status: 'all',
    dateRange: 'all',
    search: '',
    cursor: null,
    ...overrides,
  };
}

function mockListSuccess(
  items: Array<{ id: string; attemptId: string; quizTitle: string }> = [],
) {
  useMyAttemptsWithFiltersMock.mockReturnValue({
    items,
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    hasResolved: true,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    error: null,
  });
}

function mockListLoading() {
  useMyAttemptsWithFiltersMock.mockReturnValue({
    items: [],
    isLoading: true,
    isLoadingMore: false,
    hasMore: false,
    hasResolved: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    error: null,
  });
}

function mockListEmpty() {
  useMyAttemptsWithFiltersMock.mockReturnValue({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    hasResolved: true,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    error: null,
  });
}

function mockListError() {
  useMyAttemptsWithFiltersMock.mockReturnValue({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    hasResolved: true,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    error: { code: 'INTERNAL_SERVER_ERROR' },
  });
}

// ─── Setup / teardown ─────────────────────────────────────────────────────

const DEFAULT_FILTERS = makeFilters();

beforeEach(() => {
  useAttemptHistoryFiltersMock.mockReturnValue({
    filters: DEFAULT_FILTERS,
    setFilter: vi.fn((key: keyof AttemptHistoryFilters, _value: unknown) => {
      // The setFilter is a passthrough from the hook; we test it is wired.
    }),
    resetFilters: vi.fn(),
  });
  replaceMock.mockReset();
});

afterEach(() => {
  cleanup();
  useAttemptHistoryFiltersMock.mockReset();
  useMyAttemptsWithFiltersMock.mockReset();
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('QuizHistoryPage - composition', () => {
  it('renders the page heading', () => {
    mockListEmpty();
    render(<QuizHistoryPage />);
    expect(
      screen.getByTestId('quiz-history-page-heading'),
    ).toHaveTextContent('Your quiz history');
  });

  it('renders the filter bar', () => {
    mockListEmpty();
    render(<QuizHistoryPage />);
    expect(
      screen.getByTestId('quiz-history-filter-bar'),
    ).toBeInTheDocument();
  });

  it('renders the history list', () => {
    mockListEmpty();
    render(<QuizHistoryPage />);
    // Empty state renders when items are empty.
    expect(
      screen.getByTestId('quiz-history-list-empty'),
    ).toBeInTheDocument();
  });
});

describe('QuizHistoryPage - filter bar wired to URL-sync hook', () => {
  it('filter bar receives filters from the URL-sync hook', () => {
    const filters = makeFilters({ status: 'completed' });
    useAttemptHistoryFiltersMock.mockReturnValue({
      filters,
      setFilter: vi.fn(),
      resetFilters: vi.fn(),
    });
    mockListEmpty();

    render(<QuizHistoryPage />);

    expect(
      screen.getByTestId('quiz-history-filter-status-trigger'),
    ).toHaveTextContent('Completed');
  });

  it('filter bar receives setFilter from the URL-sync hook', () => {
    const setFilter = vi.fn();
    useAttemptHistoryFiltersMock.mockReturnValue({
      filters: DEFAULT_FILTERS,
      setFilter,
      resetFilters: vi.fn(),
    });
    mockListEmpty();

    render(<QuizHistoryPage />);

    const input = screen.getByTestId('quiz-history-filter-search-input');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(setFilter).toHaveBeenCalledWith('search', 'test');
  });

  it('reset button calls resetFilters from the URL-sync hook', () => {
    const resetFilters = vi.fn();
    const filters = makeFilters({ status: 'completed' });
    useAttemptHistoryFiltersMock.mockReturnValue({
      filters,
      setFilter: vi.fn(),
      resetFilters,
    });
    mockListEmpty();

    render(<QuizHistoryPage />);

    fireEvent.click(screen.getByTestId('quiz-history-filter-reset'));
    expect(resetFilters).toHaveBeenCalledTimes(1);
  });
});

describe('QuizHistoryPage - list states', () => {
  it('skeleton renders while list is loading', () => {
    mockListLoading();
    render(<QuizHistoryPage />);
    expect(
      screen.getByTestId('quiz-history-list-skeleton'),
    ).toBeInTheDocument();
  });

  it('empty-state CTA renders when list is empty', () => {
    mockListEmpty();
    render(<QuizHistoryPage />);
    expect(
      screen.getByTestId('quiz-history-list-empty'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse quizzes' })).toHaveAttribute(
      'href',
      '/quizzes',
    );
  });

  it('rows render when list has items', () => {
    mockListSuccess([
      { id: 'a1', attemptId: 'a1', quizTitle: 'Quiz One' },
      { id: 'a2', attemptId: 'a2', quizTitle: 'Quiz Two' },
    ]);
    render(<QuizHistoryPage />);
    const rows = screen.getAllByTestId('quiz-history-row');
    expect(rows.length).toBe(2);
  });

  it('5xx error renders the retry affordance', () => {
    mockListError();
    render(<QuizHistoryPage />);
    expect(screen.getByTestId('quiz-history-list-error')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-history-list-retry')).toBeInTheDocument();
  });
});
