import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { QuizDetailPageSkeleton } from '@/features/quizzes/components/QuizDetailPageSkeleton';

afterEach(() => cleanup());

describe('QuizDetailPageSkeleton', () => {
  it('reserves the complete detail composition with fixed region counts', () => {
    render(<QuizDetailPageSkeleton />);

    const page = screen.getByTestId('quiz-detail-page-skeleton');
    expect(page).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('quiz-detail-header-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-detail-cover-skeleton').className).toMatch(/aspect-4\/3/);
    expect(screen.getByTestId('quiz-detail-title-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-detail-byline-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-detail-metadata-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-detail-description-skeleton')).toBeInTheDocument();
    expect(screen.getAllByTestId('quiz-detail-question-skeleton')).toHaveLength(5);
    expect(screen.getByTestId('quiz-stats-panel-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-stats-sparkline-skeleton').className).toMatch(/h-20/);
    expect(screen.getAllByTestId('quiz-detail-cta-button-skeleton')).toHaveLength(2);

    const related = screen.getByTestId('quiz-detail-related-skeleton');
    expect(within(related).getAllByTestId('quiz-card-skeleton')).toHaveLength(3);
  });

  it('uses responsive, overflow-safe outer geometry', () => {
    render(<QuizDetailPageSkeleton />);

    const page = screen.getByTestId('quiz-detail-page-skeleton');
    expect(page.className).toMatch(/max-w-6xl/);
    expect(page.className).toMatch(/overflow-x-hidden/);
    expect(page.className).toMatch(/sm:px-6/);
    expect(page.className).toMatch(/lg:px-8/);
  });
});
