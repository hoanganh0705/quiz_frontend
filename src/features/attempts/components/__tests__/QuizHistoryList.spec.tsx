

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { QuizHistoryList } from '@/features/attempts/components/QuizHistoryList';
import type { AttemptHistoryRow } from '@/features/attempts/types/attempt-history.types';

const useMyAttemptsWithFiltersMock = vi.fn();

vi.mock(
'@/features/attempts/hooks/useMyAttemptsWithFilters',
() => ({
useMyAttemptsWithFilters: (...args: unknown[]) =>
useMyAttemptsWithFiltersMock(...args),
  }),
);

afterEach(() => {
cleanup();
useMyAttemptsWithFiltersMock.mockReset();
});

function makeRow(
overrides: Partial<AttemptHistoryRow> = {},
): AttemptHistoryRow {
return {
id: 'a1',
attemptId: 'a1',
quizId: 'q1',
quizTitle: 'Sample Quiz',
quizSlug: 'sample-quiz',
versionNumber: 1,
difficulty: 'medium',
contextType: 'solo' as const,
status: 'completed' as const,
scorePercent: 80,
correctCount: 4,
startedAt: '2026-01-01T10:00:00.000Z',
finishedAt: '2026-01-01T12:00:00.000Z',
xpEarned: 120,
...overrides,
  };
}

function mockSuccess(items: AttemptHistoryRow[] = [makeRow()]) {
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

function mockLoading() {
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

function mockEmpty() {
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

function mockError() {
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

describe('QuizHistoryList — loading skeleton', () => {
it('renders 10 skeleton rows while loading', () => {
mockLoading();
render(<QuizHistoryList filters={{ status: 'all', dateRange: 'all', search: '', cursor: null }} />);
const skeletons = screen.getAllByTestId('quiz-history-list-skeleton');

expect(screen.getByTestId('quiz-history-list-skeleton')).toBeInTheDocument();

const items = screen.getByTestId('quiz-history-list-skeleton').querySelectorAll('[class*="h-16"]');
expect(items.length).toBe(10);
  });
});

describe('QuizHistoryList — empty state', () => {
it('renders the empty-state CTA when items are empty', () => {
mockEmpty();
render(<QuizHistoryList filters={{ status: 'all', dateRange: 'all', search: '', cursor: null }} />);
expect(screen.getByTestId('quiz-history-list-empty')).toBeInTheDocument();
expect(screen.getByText('No attempts yet')).toBeInTheDocument();
  });

it('renders a link to /quizzes in the empty state', () => {
mockEmpty();
render(<QuizHistoryList filters={{ status: 'all', dateRange: 'all', search: '', cursor: null }} />);
const link = screen.getByRole('link', { name: 'Browse quizzes' });
expect(link).toHaveAttribute('href', '/quizzes');
  });
});

describe('QuizHistoryList — rows', () => {
it('renders one row per item', () => {
mockSuccess([makeRow({ id: 'a1', quizTitle: 'Quiz 1' }), makeRow({ id: 'a2', quizTitle: 'Quiz 2' })]);
render(<QuizHistoryList filters={{ status: 'all', dateRange: 'all', search: '', cursor: null }} />);
const rows = screen.getAllByTestId('quiz-history-row');
expect(rows.length).toBe(2);
  });

it('renders the list container with the correct testid', () => {
mockSuccess();
render(<QuizHistoryList filters={{ status: 'all', dateRange: 'all', search: '', cursor: null }} />);
expect(screen.getByTestId('quiz-history-list')).toBeInTheDocument();
  });
});

describe('QuizHistoryList — load more', () => {
it('does not render load-more when hasMore is false', () => {
mockSuccess();
render(<QuizHistoryList filters={{ status: 'all', dateRange: 'all', search: '', cursor: null }} />);
expect(
screen.queryByTestId('quiz-history-list-load-more'),
    ).not.toBeInTheDocument();
  });

it('renders load-more when hasMore is true', () => {
useMyAttemptsWithFiltersMock.mockReturnValue({
items: [makeRow()],
isLoading: false,
isLoadingMore: false,
hasMore: true,
hasResolved: true,
loadMore: vi.fn(),
refresh: vi.fn(),
error: null,
    });
render(<QuizHistoryList filters={{ status: 'all', dateRange: 'all', search: '', cursor: null }} />);
expect(screen.getByTestId('quiz-history-list-load-more')).toBeInTheDocument();
  });

it('disables load-more while isLoadingMore', () => {
useMyAttemptsWithFiltersMock.mockReturnValue({
items: [makeRow()],
isLoading: false,
isLoadingMore: true,
hasMore: true,
hasResolved: true,
loadMore: vi.fn(),
refresh: vi.fn(),
error: null,
    });
render(<QuizHistoryList filters={{ status: 'all', dateRange: 'all', search: '', cursor: null }} />);
expect(screen.getByTestId('quiz-history-list-load-more')).toBeDisabled();
  });
});

describe('QuizHistoryList — error retry', () => {
it('renders the retry affordance on 5xx error with no items', () => {
mockError();
render(<QuizHistoryList filters={{ status: 'all', dateRange: 'all', search: '', cursor: null }} />);
expect(screen.getByTestId('quiz-history-list-error')).toBeInTheDocument();
expect(screen.getByTestId('quiz-history-list-retry')).toBeInTheDocument();
  });

it('does not render the retry affordance when items exist even with an error', () => {
useMyAttemptsWithFiltersMock.mockReturnValue({
items: [makeRow()],
isLoading: false,
isLoadingMore: false,
hasMore: false,
hasResolved: true,
loadMore: vi.fn(),
refresh: vi.fn(),
error: { code: 'INTERNAL_SERVER_ERROR' },
    });
render(<QuizHistoryList filters={{ status: 'all', dateRange: 'all', search: '', cursor: null }} />);
expect(
screen.queryByTestId('quiz-history-list-error'),
    ).not.toBeInTheDocument();
  });

it('calls refresh when the retry button is clicked', async () => {
const refreshMock = vi.fn();
useMyAttemptsWithFiltersMock.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
hasResolved: true,
loadMore: vi.fn(),
refresh: refreshMock,
error: { code: 'INTERNAL_SERVER_ERROR' },
    });
render(<QuizHistoryList filters={{ status: 'all', dateRange: 'all', search: '', cursor: null }} />);
const btn = screen.getByTestId('quiz-history-list-retry');

await act(async () => {
fireEvent.click(btn);
    });

expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
