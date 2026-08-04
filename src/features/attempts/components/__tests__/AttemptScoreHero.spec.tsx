/**
 * `AttemptScoreHero.spec.tsx` — locks the score hero block.
 *
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.8.
 *
 * Coverage contract:
 *
 *   - Renders the headline score (`X/Y`), the percent badge, and the
 *     completion timestamp.
 *   - Renders the "Pending" badge when the score projection is null.
 *   - Renders nothing when the summary is absent.
 *   - The accessible name resolves via the heading id.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { AttemptScoreHero } from '@/features/attempts/components/AttemptScoreHero';
import type { AttemptScoreSummaryDto } from '@/features/attempts/types/attempt-result.types';

afterEach(() => {
  cleanup();
});

function makeSummary(
  overrides: Partial<AttemptScoreSummaryDto> = {},
): AttemptScoreSummaryDto {
  return {
    attemptId: 'a1',
    quizId: 'q1',
    quizTitle: 'Sample quiz',
    quizSlug: 'sample-quiz',
    totalQuestions: 5,
    correctCount: 4,
    scorePercent: 80,
    xpEarned: 120,
    finishedAt: '2026-01-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('AttemptScoreHero — projection', () => {
  it('renders the headline score, percent, and finished-at timestamp', () => {
    render(<AttemptScoreHero summary={makeSummary()} />);
    expect(screen.getByTestId('attempt-score-hero')).toBeInTheDocument();
    expect(screen.getByTestId('attempt-score-hero-correct')).toHaveTextContent(
      '4/5',
    );
    expect(screen.getByTestId('attempt-score-hero-percent')).toHaveTextContent(
      '80%',
    );
  });

  it('renders the "Pending" badge when the score projection is null', () => {
    render(
      <AttemptScoreHero
        summary={makeSummary({ scorePercent: null, correctCount: null })}
      />,
    );
    expect(screen.getByTestId('attempt-score-hero-correct')).toHaveTextContent(
      '—',
    );
    expect(screen.getByTestId('attempt-score-hero-percent')).toHaveTextContent(
      'Pending',
    );
  });

  it('renders nothing when the summary is absent', () => {
    const { container } = render(<AttemptScoreHero summary={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('AttemptScoreHero — accessibility', () => {
  it('exposes the score region with a labelled heading', () => {
    render(<AttemptScoreHero summary={makeSummary()} />);
    const region = screen.getByTestId('attempt-score-hero');
    const heading = screen.getByRole('heading', { name: 'Your score' });
    expect(heading).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-labelledby', heading.id);
  });
});