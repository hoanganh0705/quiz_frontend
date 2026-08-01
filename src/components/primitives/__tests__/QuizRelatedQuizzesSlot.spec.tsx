import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { QuizRelatedQuizzesSlot } from '@/features/quizzes/components/QuizRelatedQuizzesSlot';

afterEach(() => cleanup());

describe('QuizRelatedQuizzesSlot', () => {
  it('reserves the stable related region with exactly three card skeletons', () => {
    render(<QuizRelatedQuizzesSlot />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toBeInTheDocument();
    const slot = screen.getByTestId('quiz-related-quizzes-slot');
    expect(within(slot).getAllByTestId('quiz-card-skeleton')).toHaveLength(3);
    expect(screen.getByTestId('quiz-related-quizzes-grid').className).toMatch(
      /lg:grid-cols-3/,
    );
  });

  it('does not fabricate a quiz title or detail link', () => {
    const { container } = render(<QuizRelatedQuizzesSlot />);

    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('[data-quiz-id]')).toBeNull();
  });
});
