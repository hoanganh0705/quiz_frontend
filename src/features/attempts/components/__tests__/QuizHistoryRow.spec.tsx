

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { QuizHistoryRow } from '@/features/attempts/components/QuizHistoryRow';
import type { AttemptHistoryRow } from '@/features/attempts/types/attempt-history.types';

afterEach(() => {
cleanup();
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

describe('QuizHistoryRow — rendering', () => {
it('renders the quiz title', () => {
render(<QuizHistoryRow row={makeRow({ quizTitle: 'My Quiz' })} />);
expect(
screen.getByTestId('quiz-history-row-title-link'),
    ).toHaveTextContent('My Quiz');
  });

it('renders the score percent when present', () => {
render(<QuizHistoryRow row={makeRow({ scorePercent: 85 })} />);
expect(screen.getByTestId('quiz-history-row-score')).toHaveTextContent(
'85%',
    );
  });

it('renders a dash when score is null', () => {
render(
<QuizHistoryRow
row={makeRow({ scorePercent: null, correctCount: null })}
      />,
    );
expect(screen.getByTestId('quiz-history-row-score')).toHaveTextContent('—');
  });

it('renders XP earned', () => {
render(<QuizHistoryRow row={makeRow({ xpEarned: 50 })} />);
expect(screen.getByTestId('quiz-history-row-xp')).toHaveTextContent(
'+50 XP',
    );
  });

it('does not render XP span when xpEarned is 0', () => {
render(<QuizHistoryRow row={makeRow({ xpEarned: 0 })} />);
expect(screen.queryByTestId('quiz-history-row-xp')).not.toBeInTheDocument();
  });
});

describe('QuizHistoryRow — status badge', () => {
it('renders "Completed" badge for completed status', () => {
render(<QuizHistoryRow row={makeRow({ status: 'completed' })} />);
expect(screen.getByTestId('quiz-history-row-status')).toHaveTextContent(
'Completed',
    );
  });

it('renders "Abandoned" badge for abandoned status', () => {
render(<QuizHistoryRow row={makeRow({ status: 'abandoned' })} />);
expect(screen.getByTestId('quiz-history-row-status')).toHaveTextContent(
'Abandoned',
    );
  });

it('renders "In progress" badge for started status', () => {
render(<QuizHistoryRow row={makeRow({ status: 'started' })} />);
expect(screen.getByTestId('quiz-history-row-status')).toHaveTextContent(
'In progress',
    );
  });
});

describe('QuizHistoryRow — link', () => {
it('renders a link to the canonical detail URL', () => {
render(
<QuizHistoryRow row={makeRow({ attemptId: 'att-abc-123' })} />,
    );
const link = screen.getByTestId('quiz-history-row-title-link');
expect(link).toHaveAttribute('href', '/quiz-history/att-abc-123');
  });

it('URL-encodes the attemptId in the href', () => {
render(
<QuizHistoryRow row={makeRow({ attemptId: 'att/with spaces' })} />,
    );
const link = screen.getByTestId('quiz-history-row-title-link');
expect(link).toHaveAttribute(
'href',
'/quiz-history/att%2Fwith%20spaces',
    );
  });
});

describe('QuizHistoryRow — missing identity', () => {
it('renders nothing when attemptId is missing', () => {
const { container } = render(
<QuizHistoryRow row={makeRow({ attemptId: '' })} />,
    );
expect(container.firstChild).toBeNull();
  });

it('renders nothing when the row has no id or attemptId', () => {

const { container } = render(<QuizHistoryRow row={{ quizTitle: 'Test' }} />);
expect(container.firstChild).toBeNull();
  });
});

describe('QuizHistoryRow — accessibility', () => {
it('exposes the row as a listitem', () => {
render(<QuizHistoryRow row={makeRow()} />);
expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

it('finds the status badge via accessible query', () => {
render(<QuizHistoryRow row={makeRow({ status: 'completed' })} />);
expect(screen.getByTestId('quiz-history-row-status')).toBeInTheDocument();
  });
});
