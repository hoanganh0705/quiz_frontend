import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { useIsBookmarkedMock } = vi.hoisted(() => ({
  useIsBookmarkedMock: vi.fn(),
}));

vi.mock('@/features/quizzes/hooks/useIsBookmarked', () => ({
  useIsBookmarked: useIsBookmarkedMock,
}));

import {
  QUIZ_START_ATTEMPT_TOOLTIP,
  QuizCtaStrip,
} from '@/features/quizzes/components/QuizCtaStrip';

afterEach(() => {
  cleanup();
  useIsBookmarkedMock.mockReset();
});

describe('QuizCtaStrip', () => {
  it.each([
    [false, 'Bookmark quiz', 'Bookmark'],
    [true, 'Bookmarked quiz', 'Bookmarked'],
  ])('renders bookmark membership %s without wiring a mutation', (isBookmarked, label, text) => {
    useIsBookmarkedMock.mockReturnValue({ isBookmarked, isLoading: false });
    render(<QuizCtaStrip quizId='quiz-1' />);

    expect(useIsBookmarkedMock).toHaveBeenCalledWith('quiz-1');
    const bookmark = screen.getByRole('button', { name: label });
    expect(bookmark).toHaveTextContent(text);
    expect(bookmark).toHaveAttribute('aria-pressed', String(isBookmarked));

    fireEvent.click(bookmark);
    expect(bookmark).toHaveAttribute('aria-pressed', String(isBookmarked));
  });

  it('renders a truly disabled start control with no link or form behavior', () => {
    useIsBookmarkedMock.mockReturnValue({ isBookmarked: false, isLoading: false });
    const { container } = render(<QuizCtaStrip quizId='quiz-1' />);

    const start = screen.getByRole('button', {
      name: 'Start attempt (unavailable)',
    });
    expect(start).toBeDisabled();
    expect(start).toHaveAttribute('type', 'button');
    expect(container.querySelector('a[href*="/start"]')).toBeNull();
    expect(start.className).toMatch(/h-10/);
    expect(start.className).toMatch(/min-w-40/);
  });

  it('exposes the exact release tooltip when the disabled CTA wrapper receives keyboard focus', async () => {
    useIsBookmarkedMock.mockReturnValue({ isBookmarked: false, isLoading: false });
    render(<QuizCtaStrip quizId='quiz-1' />);

    const trigger = screen.getByTestId('quiz-start-tooltip-trigger');
    expect(trigger).toHaveAttribute('tabindex', '0');
    fireEvent.focus(trigger);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        QUIZ_START_ATTEMPT_TOOLTIP,
      );
    });
    expect(QUIZ_START_ATTEMPT_TOOLTIP).toBe(
      'Starting attempts opens in a later release',
    );
  });
});
