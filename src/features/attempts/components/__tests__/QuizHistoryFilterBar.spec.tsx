/**
 * `QuizHistoryFilterBar.spec.tsx` — locks the filter bar component.
 *
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.18.
 *
 * Coverage contract:
 *
 *   - Renders status, date-range, and search controls bound to the
 *     URL-sync hook.
 *   - Reset button restores defaults and is disabled when there are
 *     no active filters.
 *   - Empty and explicit filter values are handled correctly.
 *   - No mutation/store/service is imported.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import {
  QuizHistoryFilterBar,
  type QuizHistoryFilterBarProps,
} from '@/features/attempts/components/QuizHistoryFilterBar';
import type { AttemptHistoryFilters } from '@/features/attempts/types/attempt-history.types';
import {
  DEFAULT_ATTEMPT_HISTORY_FILTERS,
} from '@/features/attempts/types/attempt-history.types';

afterEach(() => {
  cleanup();
});

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

function renderFilterBar(props: Partial<QuizHistoryFilterBarProps> = {}) {
  const filters = makeFilters(props.filters);
  const onFilterChange = props.onFilterChange ?? vi.fn();
  const onReset = props.onReset ?? vi.fn();

  return {
    ...render(
      <QuizHistoryFilterBar
        filters={filters}
        onFilterChange={onFilterChange}
        onReset={onReset}
      />,
    ),
    onFilterChange,
    onReset,
  };
}

// ─── Rendering ─────────────────────────────────────────────────────────────

describe('QuizHistoryFilterBar — rendering', () => {
  it('renders the status dropdown', () => {
    renderFilterBar();
    expect(
      screen.getByTestId('quiz-history-filter-status-trigger'),
    ).toBeInTheDocument();
  });

  it('renders the date-range dropdown', () => {
    renderFilterBar();
    expect(
      screen.getByTestId('quiz-history-filter-date-trigger'),
    ).toBeInTheDocument();
  });

  it('renders the search input', () => {
    renderFilterBar();
    expect(
      screen.getByTestId('quiz-history-filter-search-input'),
    ).toBeInTheDocument();
  });

  it('renders the reset button', () => {
    renderFilterBar();
    expect(screen.getByTestId('quiz-history-filter-reset')).toBeInTheDocument();
  });
});

// ─── Controls ───────────────────────────────────────────────────────────────

describe('QuizHistoryFilterBar — controls', () => {
  it('displays the current status value in the dropdown', () => {
    renderFilterBar({ filters: makeFilters({ status: 'completed' }) });
    expect(
      screen.getByTestId('quiz-history-filter-status-trigger'),
    ).toHaveTextContent('Completed');
  });

  it('displays the current date-range value in the dropdown', () => {
    renderFilterBar({ filters: makeFilters({ dateRange: 'last_7_days' }) });
    expect(
      screen.getByTestId('quiz-history-filter-date-trigger'),
    ).toHaveTextContent('Last 7 days');
  });

  it('displays the current search value in the input', () => {
    renderFilterBar({ filters: makeFilters({ search: 'my quiz' }) });
    expect(
      screen.getByTestId('quiz-history-filter-search-input'),
    ).toHaveValue('my quiz');
  });
});

// ─── onFilterChange ─────────────────────────────────────────────────────────

/**
 * The component is a thin passthrough — it calls `onFilterChange` with the
 * exact values from the Select / Input without transformation.
 * We verify the callback is wired correctly by invoking it directly.
 */
describe('QuizHistoryFilterBar — onFilterChange', () => {
  it('calls onFilterChange when the search input changes', () => {
    const { onFilterChange } = renderFilterBar();
    const input = screen.getByTestId('quiz-history-filter-search-input');

    fireEvent.change(input, { target: { value: 'test quiz' } });

    expect(onFilterChange).toHaveBeenCalledWith('search', 'test quiz');
  });

  it('onFilterChange is called on every keystroke (not just on blur)', () => {
    const { onFilterChange } = renderFilterBar();
    const input = screen.getByTestId('quiz-history-filter-search-input');

    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });

    expect(onFilterChange).toHaveBeenCalledTimes(3);
    expect(onFilterChange).toHaveBeenLastCalledWith('search', 'abc');
  });
});

// ─── Reset ─────────────────────────────────────────────────────────────────

describe('QuizHistoryFilterBar — reset', () => {
  it('calls onReset when the reset button is clicked', () => {
    const { onReset } = renderFilterBar({
      filters: makeFilters({ status: 'completed' }),
    });
    const btn = screen.getByTestId('quiz-history-filter-reset');

    fireEvent.click(btn);

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('reset button is disabled when no filters are active', () => {
    renderFilterBar({ filters: DEFAULT_ATTEMPT_HISTORY_FILTERS });
    expect(screen.getByTestId('quiz-history-filter-reset')).toBeDisabled();
  });

  it('reset button is enabled when status is non-default', () => {
    renderFilterBar({
      filters: makeFilters({ status: 'completed' }),
    });
    expect(screen.getByTestId('quiz-history-filter-reset')).toBeEnabled();
  });

  it('reset button is enabled when search is non-empty', () => {
    renderFilterBar({
      filters: makeFilters({ search: 'something' }),
    });
    expect(screen.getByTestId('quiz-history-filter-reset')).toBeEnabled();
  });
});
