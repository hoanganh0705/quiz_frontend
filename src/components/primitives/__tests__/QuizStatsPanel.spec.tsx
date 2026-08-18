import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { QuizStatsPanel } from '@/features/quizzes/components/QuizStatsPanel';
import type { ApiError } from '@/lib/api';
import type { QuizStatsResponseDto } from '@/lib/api/generated/schemas/quizStatsResponseDto';

function makeStats(
overrides: Partial<QuizStatsResponseDto> = {},
): QuizStatsResponseDto {
return {
quizId: 'quiz-1',
totalAttempts: 1234,
uniquePlayers: 987,
averageScore: 73.25,
averageRating: 4.2,
bookmarkCount: 56,
completionRate: 81.75,
popularityScore: 91.4,
trendingScore: 12.6,
commentsCount: 42,
recentActivity: [],
...overrides,
  };
}

function metric(label: string): HTMLElement {
const term = screen.getByText(label, { selector: 'dt' });
const wrapper = term.parentElement;
if (!wrapper) throw new Error(`Metric wrapper missing for ${label}`);
return wrapper;
}

afterEach(() => cleanup());

describe('QuizStatsPanel', () => {
it('maps every generated aggregate to the approved label and format', () => {
render(<QuizStatsPanel stats={makeStats()} />);

expect(metric('Total attempts')).toHaveTextContent('1,234');
expect(metric('Unique players')).toHaveTextContent('987');
expect(metric('Average score')).toHaveTextContent('73.3%');
expect(metric('Average rating')).toHaveTextContent('4.2 / 5');
expect(metric('Bookmarks')).toHaveTextContent('56');
expect(metric('Completion rate')).toHaveTextContent('81.8%');
expect(metric('Popularity score')).toHaveTextContent('91.4');
expect(metric('Trending score')).toHaveTextContent('12.6');
expect(screen.getAllByTestId('quiz-stats-metric')).toHaveLength(8);
  });

it.each([
['stats 404', { stats: null, noStats: true }],
['no attempts', { stats: makeStats({ totalAttempts: 0 }) }],
  ])('renders visible numeric zeros and the no-stats caption for %s', (_, props) => {
render(<QuizStatsPanel {...props} />);

const panel = screen.getByTestId('quiz-stats-panel');
expect(panel).toHaveAttribute('data-state', 'empty');
expect(screen.getByTestId('quiz-stats-empty-caption')).toHaveTextContent(
'Data will populate as people play',
    );
expect(within(panel).getAllByText(/^0(?:\.0)?(?:%| \/ 5)?$/)).toHaveLength(8);
  });

it('uses a fixed metric and trend skeleton while loading', () => {
render(<QuizStatsPanel stats={null} isLoading />);

expect(screen.getByTestId('quiz-stats-panel-skeleton')).toHaveAttribute(
'aria-busy',
'true',
    );
expect(
screen.getByTestId('quiz-stats-metric-skeletons').querySelectorAll(
'[data-slot="skeleton"]',
      ),
    ).toHaveLength(16);
expect(screen.getByTestId('quiz-stats-sparkline-skeleton').className).toMatch(/h-20/);
  });

it('isolates an error and retries only through the supplied callback', () => {
const onRetry = vi.fn();
render(
<QuizStatsPanel
stats={null}
error={{ status: 503 } as ApiError}
onRetry={onRetry}
      />,
    );

expect(screen.getByRole('alert')).toHaveTextContent(
'Statistics are temporarily unavailable',
    );
fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
expect(onRetry).toHaveBeenCalledTimes(1);
  });

it('never fabricates a sparkline when the DTO has no history series', () => {
render(<QuizStatsPanel stats={makeStats()} />);

expect(screen.queryByTestId('sparkline')).not.toBeInTheDocument();
expect(screen.getByTestId('quiz-stats-trend-placeholder')).toHaveAccessibleName(
'Historical activity is not available',
    );
  });
});
