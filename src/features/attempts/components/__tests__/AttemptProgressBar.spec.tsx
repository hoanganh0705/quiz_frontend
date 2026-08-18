

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AttemptProgressBar } from '@/features/attempts/components/AttemptProgressBar';

describe('AttemptProgressBar — zero-question edge case', () => {
it('renders a stable empty state without dividing by zero', () => {
render(
<AttemptProgressBar
totalQuestions={0}
currentIndex={0}
submittedCount={0}
      />,
    );

expect(screen.getByTestId('attempt-progress-bar')).toBeInTheDocument();
expect(screen.getByText('No questions yet.')).toBeInTheDocument();

const bar = screen.getByRole('progressbar');
expect(bar.getAttribute('aria-valuemin')).toBe('0');
expect(bar.getAttribute('aria-valuemax')).toBe('0');
expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });
});

describe('AttemptProgressBar — first / middle / last position', () => {
it('reports first position correctly', () => {
render(
<AttemptProgressBar
totalQuestions={4}
currentIndex={0}
submittedCount={0}
      />,
    );

expect(
screen.getByTestId('attempt-progress-bar-position').textContent,
    ).toBe('Question 1 of 4');
expect(
screen.getByTestId('attempt-progress-bar-submitted').textContent,
    ).toBe('0 submitted');
  });

it('reports middle position correctly', () => {
render(
<AttemptProgressBar
totalQuestions={4}
currentIndex={2}
submittedCount={2}
      />,
    );

expect(
screen.getByTestId('attempt-progress-bar-position').textContent,
    ).toBe('Question 3 of 4');
expect(
screen.getByTestId('attempt-progress-bar-submitted').textContent,
    ).toBe('2 submitted');
  });

it('reports last position correctly', () => {
render(
<AttemptProgressBar
totalQuestions={4}
currentIndex={3}
submittedCount={4}
      />,
    );

expect(
screen.getByTestId('attempt-progress-bar-position').textContent,
    ).toBe('Question 4 of 4');
expect(
screen.getByTestId('attempt-progress-bar-submitted').textContent,
    ).toBe('4 submitted');
  });
});

describe('AttemptProgressBar — aria values', () => {
it('exposes valid aria-valuemin / valuemax / valuenow', () => {
render(
<AttemptProgressBar
totalQuestions={10}
currentIndex={4}
submittedCount={2}
      />,
    );

const bar = screen.getByRole('progressbar');
expect(bar.getAttribute('aria-valuemin')).toBe('0');
expect(bar.getAttribute('aria-valuemax')).toBe('10');

expect(bar.getAttribute('aria-valuenow')).toBe('5');
expect(bar.getAttribute('aria-label')).toBe('Question 5 of 10');
  });
});

describe('AttemptProgressBar — invariant', () => {
it('does not render any score / pass / fail copy', () => {
const { container } = render(
<AttemptProgressBar
totalQuestions={5}
currentIndex={2}
submittedCount={2}
      />,
    );

expect(container.textContent).not.toMatch(/isCorrect|score|pass|fail|complete/i);
  });

it('clamps submitted count to totalQuestions', () => {
render(
<AttemptProgressBar
totalQuestions={3}
currentIndex={2}
submittedCount={10}
      />,
    );

const bar = screen.getByRole('progressbar');

const filled = bar.querySelectorAll('div');
expect(filled[1]?.getAttribute('style')).toContain('width: 100%');
  });
});